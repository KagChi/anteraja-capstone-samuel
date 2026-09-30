<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Repositories\RadiusRepository;

final class RadiusController
{
    public function __construct(private readonly RadiusRepository $radius) {}

    public function index(Request $request): never
    {
        Response::json([
            'data' => $this->radius->segments(),
            'meta' => $this->radius->meta(),
        ]);
    }
}
