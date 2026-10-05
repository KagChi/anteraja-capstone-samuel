<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecideMeetingPointRequest;
use App\Models\MeetingPoint;
use App\Services\Delivery\MeetingPointService;
use App\Support\Auth;
use App\Support\CursorPage;
use App\Support\Presentation\MeetingPointPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FRD-04 approval queue: proposals waiting for a decision plus the admin's
 * unilateral point (FR-04-09).
 */
class MeetingPointController extends Controller
{
    use RespondsWithEnvelope;

    private const DEFAULT_PER_PAGE = 100;

    private const MAX_PER_PAGE = 300;

    public function index(Request $request, MeetingPointService $meetingPoints): JsonResponse
    {
        $meetingPoints->expireStale();

        $perPage = $this->perPage($request);

        $query = MeetingPoint::query()
            ->withPointProjections()
            ->with([
                'shipment:id,tracking_number,service_type,courier_id',
                'shipment.courier:id,name,code',
            ]);

        $status = $request->query('status', 'proposed');

        if (is_string($status) && in_array($status, ['proposed', 'approved', 'admin_set', 'rejected', 'expired'], true)) {
            $query->where('status', $status);
        }

        $page = CursorPage::get(
            $query->orderByDesc('created_at')->orderByDesc('id'),
            $perPage,
            $request->query('cursor'),
            'created_at',
            'id',
            'desc',
            fn (MeetingPoint $meeting) => MeetingPointPresenter::row($meeting),
        );

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        return $this->ok(MeetingPointPresenter::adminDetail($this->meeting($id)));
    }

    public function decide(string $id, DecideMeetingPointRequest $request, MeetingPointService $meetingPoints): JsonResponse
    {
        $meeting = $this->meeting($id);
        $shipment = $meeting->shipment;
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat memutuskan titik temu.');
        }

        $meeting = $meetingPoints->decide(
            $meeting,
            $admin,
            (string) $request->input('decision'),
            $request->input('note'),
            $request->input('latitude') !== null ? (float) $request->input('latitude') : null,
            $request->input('longitude') !== null ? (float) $request->input('longitude') : null,
        );
        // refresh() drops eager loads; re-attach so the presenter keeps the
        // destination coordinates and relations the map needs.
        $meeting->setRelation('shipment', $shipment);

        return $this->ok(MeetingPointPresenter::adminDetail($meeting));
    }

    private function meeting(string $key): MeetingPoint
    {
        $with = [
            'shipment' => fn ($query) => $query->withPresentation()->withDestinationCoordinates(),
        ];

        $meeting = Str::isUuid($key)
            ? MeetingPoint::query()
                ->withPointProjections()
                ->with($with)
                ->where('id', $key)
                ->first()
            : null;

        if (! $meeting) {
            $meeting = MeetingPoint::query()
                ->withPointProjections()
                ->with($with)
                ->whereHas('shipment', fn ($query) => $query->where('tracking_number', $key))
                ->latest('created_at')
                ->first();
        }

        if (! $meeting) {
            throw (new ModelNotFoundException)->setModel(MeetingPoint::class, [$key]);
        }

        return $meeting;
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        if ($requested < 1) {
            return self::DEFAULT_PER_PAGE;
        }

        return min($requested, self::MAX_PER_PAGE);
    }
}
