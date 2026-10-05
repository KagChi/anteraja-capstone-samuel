<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecideGpsLockRequest;
use App\Models\GpsLockRequest;
use App\Services\Verification\GpsLockService;
use App\Support\Auth;
use App\Support\CursorPage;
use App\Support\Presentation\GpsLockPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GpsLockController extends Controller
{
    use RespondsWithEnvelope;

    private const DEFAULT_PER_PAGE = 100;

    private const MAX_PER_PAGE = 300;

    public function index(Request $request): JsonResponse
    {
        $perPage = $this->perPage($request);

        $query = GpsLockRequest::query()->with([
            'shipment:id,tracking_number,service_type',
            'courier:id,name,code',
        ]);

        $status = $request->query('status');

        if (is_string($status) && in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $status);
        }

        $page = CursorPage::get(
            $query->orderByDesc('created_at')->orderByDesc('id'),
            $perPage,
            $request->query('cursor'),
            'created_at',
            'id',
            'desc',
            fn (GpsLockRequest $lock) => GpsLockPresenter::row($lock),
        );

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        return $this->ok(GpsLockPresenter::detail($this->lock($id)));
    }

    public function decide(string $id, DecideGpsLockRequest $request, GpsLockService $locks): JsonResponse
    {
        $lock = $this->lock($id);
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat memutuskan blokir GPS.');
        }

        $lock = $locks->decide(
            $lock,
            $admin,
            (string) $request->input('decision'),
            $request->input('note'),
        );

        return $this->ok(GpsLockPresenter::detail($lock));
    }

    private function lock(string $key): GpsLockRequest
    {
        $lock = Str::isUuid($key)
            ? GpsLockRequest::query()
                ->with(['shipment' => fn ($query) => $query->withDestinationCoordinates(), 'courier'])
                ->where('id', $key)
                ->first()
            : null;

        if (! $lock) {
            $lock = GpsLockRequest::query()
                ->with(['shipment' => fn ($query) => $query->withDestinationCoordinates(), 'courier'])
                ->whereHas('shipment', fn ($query) => $query->where('tracking_number', $key))
                ->latest('created_at')
                ->first();
        }

        if (! $lock) {
            throw (new ModelNotFoundException)->setModel(GpsLockRequest::class, [$key]);
        }

        return $lock;
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
