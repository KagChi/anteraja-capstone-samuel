<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Services\Delivery\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    use RespondsWithEnvelope;

    public function __invoke(DashboardService $dashboard): JsonResponse
    {
        return $this->ok($dashboard->summary());
    }
}
