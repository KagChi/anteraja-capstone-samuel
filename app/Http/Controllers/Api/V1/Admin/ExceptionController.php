<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecideExceptionRequest;
use App\Models\DeliveryException;
use App\Services\Delivery\ExceptionService;
use App\Support\Auth;
use App\Support\Presentation\ExceptionPresenter;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ExceptionController extends Controller
{
    use RespondsWithEnvelope;

    public function index(): JsonResponse
    {
        $rows = DeliveryException::query()
            ->with(['shipment.deliveryProofs', 'courier'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DeliveryException $exception) => ExceptionPresenter::row($exception))
            ->values()
            ->all();

        return $this->ok($rows, 200, ['total' => count($rows)]);
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
                ->where('id', $key)
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
