<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecideExceptionRequest;
use App\Models\DeliveryException;
use App\Services\Delivery\ExceptionService;
use App\Support\Auth;
use App\Support\CursorPage;
use App\Support\Presentation\ExceptionPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExceptionController extends Controller
{
    use RespondsWithEnvelope;

    private const DEFAULT_PER_PAGE = 100;

    private const MAX_PER_PAGE = 300;

    public function index(Request $request): JsonResponse
    {
        $perPage = $this->perPage($request);

        $query = DeliveryException::query()
            ->with([
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
            fn (DeliveryException $exception) => ExceptionPresenter::row($exception),
        );

        return $this->ok($page['rows'], 200, [
            'per_page' => $perPage,
            'next_cursor' => $page['next_cursor'],
            'has_more' => $page['next_cursor'] !== null,
        ]);
    }

    private function perPage(Request $request): int
    {
        $requested = $request->integer('per_page');

        if ($requested < 1) {
            return self::DEFAULT_PER_PAGE;
        }

        return min($requested, self::MAX_PER_PAGE);
    }

    public function show(string $id): JsonResponse
    {
        return $this->ok(ExceptionPresenter::detail($this->exception($id)));
    }

    public function decide(string $id, DecideExceptionRequest $request, ExceptionService $exceptions): JsonResponse
    {
        $exception = $this->exception($id);
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat memutuskan pengecualian.');
        }

        $exception = $exceptions->decide(
            $exception,
            $admin,
            (string) $request->input('decision'),
            $request->input('note'),
        );

        return $this->ok(ExceptionPresenter::detail($exception));
    }

    private function exception(string $key): DeliveryException
    {
        $exception = null;

        if (Str::isUuid($key)) {
            $exception = DeliveryException::query()
                ->with(['shipment.deliveryProofs', 'courier'])
                ->where(fn ($query) => $query->where('id', $key)->orWhere('shipment_id', $key))
                ->latest('created_at')
                ->first();
        }

        if (! $exception) {
            $exception = DeliveryException::query()
                ->with(['shipment.deliveryProofs', 'courier'])
                ->whereHas('shipment', function ($query) use ($key): void {
                    $query->where('tracking_number', $key);
                })
                ->latest('created_at')
                ->first();
        }

        if (! $exception) {
            throw (new ModelNotFoundException)->setModel(DeliveryException::class, [$key]);
        }

        return $exception;
    }
}
