<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAction;
use App\Models\Shipment;
use App\Services\Audit\AuditService;
use App\Support\Auth;
use App\Support\Date;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * FR-05-08: the audit trail is exportable for escalation. CSV keeps the
 * export dependency-free (the FRD names CSV as the example format) while the
 * access itself is recorded for FR-05-09.
 */
class AuditExportController extends Controller
{
    public function __invoke(string $id, AuditService $audit): StreamedResponse
    {
        $shipment = Shipment::query()
            ->withPresentation()
            ->withDestinationCoordinates()
            ->where(function ($query) use ($id): void {
                if (Str::isUuid($id)) {
                    $query->where('id', $id)->orWhere('tracking_number', $id);
                } else {
                    $query->where('tracking_number', $id);
                }
            })
            ->first();

        if (! $shipment) {
            throw (new ModelNotFoundException)->setModel(Shipment::class, [$id]);
        }

        $admin = Auth::getCurrentAdmin();

        if ($admin) {
            $audit->log('export', 'admin', $admin['id'], $shipment->id, [
                'page' => '/api/v1/admin/shipments/'.$id.'/audit-export',
            ]);
        }

        $rows = $this->rows($shipment);
        $filename = sprintf('audit-%s-%s.csv', $shipment->tracking_number, Date::now()->format('Ymd-His'));

        return response()->streamDownload(function () use ($rows): void {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fputcsv($handle, ['bagian', 'waktu', 'aktor', 'jenis', 'detail', 'latitude', 'longitude', 'jarak_m']);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return list<array<int, string|int|null>>
     */
    private function rows(Shipment $shipment): array
    {
        $rows = [];
        $destination = [$shipment->destination_lat, $shipment->destination_lng];

        $rows[] = ['ringkasan', Date::dateTimeLabel($shipment->created_at), '—', $shipment->status,
            sprintf('%s • %s • penerima %s', $shipment->tracking_number, $shipment->service_type, $shipment->recipient?->name ?? '—'),
            $destination[0], $destination[1], null];

        $proof = $shipment->deliveryProofs->sortByDesc(fn ($item) => $item->review_status === 'valid')->first();

        if ($proof !== null) {
            $rows[] = ['pod', Date::dateTimeLabel($proof->captured_at), 'courier', $proof->review_status,
                sprintf('POD %d m dari tujuan • %s', $proof->distance_to_destination_m, $proof->watermark_hash),
                $proof->point_lat, $proof->point_lng, $proof->distance_to_destination_m];
        }

        $pin = $shipment->pinChallenge;

        if ($pin !== null) {
            $rows[] = ['pin', Date::dateTimeLabel($pin->verified_at ?? $pin->locked_at ?? $pin->created_at), 'system', $pin->status,
                sprintf('percobaan %d/%d • resend %d', $pin->attempts, $pin->max_attempts, $pin->resend_count),
                null, null, null];
        }

        $geofence = $shipment->activeGeofence;

        if ($geofence !== null) {
            $rows[] = ['geofence', '—', 'system', $geofence->source,
                sprintf('radius %d m', $geofence->radius_m), null, null, null];
        }

        foreach ($shipment->anomalyFlags as $flag) {
            $rows[] = ['anomali', Date::dateTimeLabel($flag->detected_at), 'system', $flag->flag_type,
                sprintf('bobot %s • %s', $flag->weight, $flag->is_resolved ? 'selesai' : 'terbuka'),
                null, null, null];
        }

        foreach ($shipment->deliveryEvents as $event) {
            $rows[] = ['event', Date::dateTimeLabel($event->created_at), $event->actor_type, $event->event_type,
                json_encode($event->metadata ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}',
                $event->point_lat, $event->point_lng, $event->distance_to_destination_m];
        }

        foreach ($this->adminActions($shipment) as $action) {
            $rows[] = ['admin_action', Date::dateTimeLabel($action->created_at), 'admin', $action->action_type,
                $action->reason ?? '', null, null, null];
        }

        return $rows;
    }

    /**
     * @return Collection<int, AdminAction>
     */
    private function adminActions(Shipment $shipment)
    {
        $targetIds = $shipment->deliveryProofs->pluck('id')
            ->merge($shipment->deliveryExceptions->pluck('id'))
            ->merge($shipment->gpsLockRequests->pluck('id'))
            ->merge($shipment->claimCases->pluck('id'))
            ->push($shipment->pinChallenge?->id)
            ->filter()
            ->unique()
            ->values();

        return AdminAction::query()
            ->where(fn ($query) => $query
                ->where(fn ($inner) => $inner->where('target_type', 'shipment')->where('target_id', $shipment->id))
                ->orWhereIn('target_id', $targetIds))
            ->orderBy('created_at')
            ->get();
    }
}
