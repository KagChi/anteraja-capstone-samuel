<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Services\ShippingCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class ShippingQuoteController extends Controller
{
    use RespondsWithEnvelope;

    public function __invoke(Request $request, ShippingCalculator $calculator): JsonResponse
    {
        $data = $request->validate([
            'weight' => ['required', 'numeric', 'gt:0'],
            'distance' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $quote = $calculator->quote((float) $data['weight'], (float) $data['distance']);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'weight' => $exception->getMessage(),
            ]);
        }

        return $this->ok($quote);
    }
}
