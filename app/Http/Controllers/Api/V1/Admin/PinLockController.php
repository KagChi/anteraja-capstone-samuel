<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecidePinLockRequest;
use App\Models\PinChallenge;
use App\Services\Verification\PinService;
use App\Support\Auth;
use App\Support\CursorPage;
use App\Support\Presentation\PinLockPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * FR-03-08: the admin dashboard that clears a locked PIN or overrides it.
 */
class PinLockController extends Controller
{
    use RespondsWithEnvelope;

    private const DEFAULT_PER_PAGE = 100;

    private const MAX_PER_PAGE = 300;

    public function index(Request $request): JsonResponse
    {
        $perPage = $this->perPage($request);

        $query = PinChallenge::query()->with([
            'shipment:id,tracking_number,service_type,courier_id,recipient_id',
            'shipment.courier:id,name,code',
            'shipment.recipient:id,name',
        ]);

        // The dashboard opens on the locked queue; `all` is the escape hatch.
        $status = $request->query('status', 'locked');

        if (is_string($status) && in_array($status, ['locked', 'expired', 'pending', 'override'], true)) {
            $query->where('status', $status);
        }

        $page = CursorPage::get(
            $query->orderByDesc('created_at')->orderByDesc('id'),
            $perPage,
            $request->query('cursor'),
            'created_at',
            'id',
            'desc',
            fn (PinChallenge $challenge) => PinLockPresenter::row($challenge),
        );

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        return $this->ok(PinLockPresenter::detail($this->challenge($id)));
    }

    public function decide(string $id, DecidePinLockRequest $request, PinService $pins): JsonResponse
    {
        $challenge = $this->challenge($id);
        $shipment = $challenge->shipment;
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat membuka blokir PIN.');
        }

        $challenge = $pins->decide(
            $challenge,
            $admin,
            (string) $request->input('decision'),
            (string) $request->input('note'),
        );
        // refresh() drops eager loads; re-attach so the presenter keeps its
        // courier/recipient context without another query.
        $challenge->setRelation('shipment', $shipment);

        return $this->ok(PinLockPresenter::detail($challenge));
    }

    private function challenge(string $key): PinChallenge
    {
        $with = ['shipment' => fn ($query) => $query->with(['courier', 'recipient'])];

        $challenge = Str::isUuid($key)
            ? PinChallenge::query()
                ->with($with)
                ->where(fn ($query) => $query->where('id', $key)->orWhere('shipment_id', $key))
                ->first()
            : null;

        if (! $challenge) {
            $challenge = PinChallenge::query()
                ->with($with)
                ->whereHas('shipment', fn ($query) => $query->where('tracking_number', $key))
                ->first();
        }

        if (! $challenge) {
            throw (new ModelNotFoundException)->setModel(PinChallenge::class, [$key]);
        }

        return $challenge;
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
