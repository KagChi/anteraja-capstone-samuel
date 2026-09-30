<?php

namespace App\Http\Controllers\Api\Concerns;

use Illuminate\Http\JsonResponse;

/**
 * PRD §8 API envelope: { success, data, error } (+ optional meta).
 */
trait RespondsWithEnvelope
{
    /**
     * @param  array<string, mixed>  $meta
     */
    protected function ok(mixed $data, int $status = 200, array $meta = []): JsonResponse
    {
        $payload = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    protected function fail(string $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'error' => ['code' => $code, 'message' => $message],
        ], $status);
    }
}
