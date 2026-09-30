<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Support\Date;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    use RespondsWithEnvelope;

    public function __invoke(): JsonResponse
    {
        return $this->ok([
            'status' => 'ok',
            'service' => 'anteraja-instant-api',
            'time' => Date::now()->toIso8601String(),
        ]);
    }
}
