<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Repositories\ShipmentRepository;

final class ShipmentController
{
    public function __construct(private readonly ShipmentRepository $shipments) {}

    public function index(Request $request): never
    {
        $rows = $this->shipments->all();

        Response::json([
            'data' => $rows,
            'meta' => ['total' => count($rows)],
        ]);
    }

    public function show(Request $request, string $id): never
    {
        $row = $this->shipments->find(rawurldecode($id));
        if ($row === null) {
            Response::json(['error' => 'Resi tidak ditemukan'], 404);
        }

        Response::json([
            'data' => $row,
            'detail' => $this->shipments->detail((string) $row['tracking']),
        ]);
    }
}
