<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;

final class HealthController
{
    public function index(Request $request): never
    {
        Response::json([
            'status' => 'ok',
            'service' => 'anteraja-dummy-api',
            'time' => date(DATE_ATOM),
        ]);
    }
}
