<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\DecideExceptionRequest;
use App\Models\DeliveryException;
use App\Services\Delivery\ExceptionService;
use App\Support\Auth;
use App\Support\Presentation\ExceptionPresenter;
use Illuminate\Http\JsonResponse;

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
        $exception = DeliveryException::query()
            ->with(['shipment.deliveryProofs', 'courier'])
            ->findOrFail($id);

        return $this->ok(ExceptionPresenter::detail($exception));
    }

    public function decide(string $id, DecideExceptionRequest $request, ExceptionService $exceptions): JsonResponse
    {
        $exception = DeliveryException::with(['shipment.deliveryProofs', 'courier'])->findOrFail($id);
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
}
