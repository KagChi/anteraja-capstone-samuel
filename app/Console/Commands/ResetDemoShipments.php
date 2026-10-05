<?php

namespace App\Console\Commands;

use App\Models\AnomalyFlag;
use App\Models\DeliveryEvent;
use App\Models\DeliveryException;
use App\Models\DeliveryProof;
use App\Models\GpsLockRequest;
use App\Models\MeetingPoint;
use App\Models\PinChallenge;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Puts demo shipments back into their seeded state so the courier, PIN and
 * POD flows can be demonstrated again: proofs and exceptions are removed,
 * flow events are dropped, the PIN challenge is reissued and the shipment
 * returns to pending.
 */
class ResetDemoShipments extends Command
{
    protected $signature = 'demo:reset-shipments {shipments* : Tracking numbers or shipment ids}';

    protected $description = 'Reset demo shipments to their seeded pending state';

    /**
     * Event types that belong to the seeded dataset per tracking number.
     *
     * @var array<string, array<int, string>>
     */
    private const SEEDED_EVENTS = [
        'AJ2509000011' => ['pickup', 'arrived', 'geofence_check'],
        'AJ2509001001' => [],
    ];

    /**
     * Flow events that are always removed when no seeded set is known.
     *
     * @var array<int, string>
     */
    private const FLOW_EVENTS = [
        'pin_verification', 'pod_captured', 'delivered',
        'exception_requested', 'exception_decided', 'delivery_attempt',
        'gps_blocked', 'gps_lock_requested', 'gps_lock_decided',
        'meeting_point_proposed', 'meeting_point_approved',
        'meeting_point_rejected', 'meeting_point_expired',
    ];

    public function handle(): int
    {
        /** @var array<int, string> $keys */
        $keys = $this->argument('shipments');

        foreach ($keys as $key) {
            $shipment = Str::isUuid($key)
                ? Shipment::query()
                    ->where(fn ($query) => $query->where('id', $key)->orWhere('tracking_number', $key))
                    ->first()
                : Shipment::query()->where('tracking_number', $key)->first();

            if (! $shipment) {
                $this->error("Shipment {$key} not found.");

                continue;
            }

            DeliveryProof::query()->where('shipment_id', $shipment->id)->delete();
            DeliveryException::query()->where('shipment_id', $shipment->id)->delete();
            GpsLockRequest::query()->where('shipment_id', $shipment->id)->delete();
            MeetingPoint::query()->where('shipment_id', $shipment->id)->delete();

            $seeded = self::SEEDED_EVENTS[$shipment->tracking_number] ?? null;
            $events = DeliveryEvent::query()->where('shipment_id', $shipment->id);

            if ($seeded === []) {
                $events->delete();
            } elseif ($seeded !== null) {
                $events->whereNotIn('event_type', $seeded)->delete();
            } else {
                $events->whereIn('event_type', self::FLOW_EVENTS)->delete();
            }

            AnomalyFlag::query()
                ->where('shipment_id', $shipment->id)
                ->whereIn('flag_type', [
                    'pod_invalid', 'pod_needs_review', 'device_time_mismatch',
                    'mock_gps_suspected', 'repeated_pin_failure',
                ])
                ->delete();

            PinChallenge::query()->where('shipment_id', $shipment->id)->update([
                'status' => 'pending',
                'attempts' => 0,
                'verified_at' => null,
                'locked_at' => null,
                'override_by' => null,
                'override_reason' => null,
                'override_at' => null,
                'expires_at' => Date::now()->addMinutes(15),
            ]);

            $shipment->update(['status' => 'pending', 'delivered_at' => null]);

            $this->info("{$shipment->tracking_number}: pending (proofs and flow events cleared, PIN reissued).");
        }

        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return self::SUCCESS;
    }
}
