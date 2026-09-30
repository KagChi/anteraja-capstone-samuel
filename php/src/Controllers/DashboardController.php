<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Repositories\DashboardRepository;

final class DashboardController
{
    public function __construct(private readonly DashboardRepository $dashboard) {}

    public function index(Request $request): never
    {
        Response::json(['data' => $this->dashboard->summary()]);
    }
}
