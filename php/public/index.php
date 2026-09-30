<?php

declare(strict_types=1);

require __DIR__.'/../src/lib/response.php';
require __DIR__.'/../src/data/shipments.php';
require __DIR__.'/../src/data/shipment-details.php';
require __DIR__.'/../src/data/tasks.php';
require __DIR__.'/../src/data/exceptions.php';
require __DIR__.'/../src/data/radius.php';
require __DIR__.'/../src/data/dashboard.php';
require __DIR__.'/../src/shipping-calculator.php';

cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$path = rtrim($path, '/');
if ($path === '') {
    $path = '/';
}

if ($method !== 'GET') {
    json(['error' => 'Metode tidak diizinkan'], 405);
}

// GET /api/health
if ($path === '/api/health' || $path === '/') {
    json([
        'status' => 'ok',
        'service' => 'anteraja-dummy-api',
        'time' => date(DATE_ATOM),
    ]);
}

// GET /api/shipments
if ($path === '/api/shipments') {
    $rows = shipments_all();
    json([
        'data' => $rows,
        'meta' => ['total' => count($rows)],
    ]);
}

// GET /api/shipments/{id}
if (preg_match('#^/api/shipments/([^/]+)$#', $path, $matches) === 1) {
    $row = shipments_find(rawurldecode($matches[1]));
    if ($row === null) {
        json(['error' => 'Resi tidak ditemukan'], 404);
    }
    json([
        'data' => $row,
        'detail' => shipment_detail((string) $row['tracking']),
    ]);
}

// GET /api/shipping/quote?weight=&distance=
if ($path === '/api/shipping/quote') {
    $weight = isset($_GET['weight']) && is_numeric($_GET['weight'])
        ? (float) $_GET['weight']
        : null;
    $distance = isset($_GET['distance']) && is_numeric($_GET['distance'])
        ? (float) $_GET['distance']
        : null;

    if ($weight === null || $distance === null) {
        json(['error' => 'Parameter weight dan distance wajib berupa angka'], 422);
    }

    try {
        json(['data' => quoteShipment($weight, $distance)]);
    } catch (InvalidArgumentException $exception) {
        json(['error' => $exception->getMessage()], 422);
    }
}

// GET /api/dashboard
if ($path === '/api/dashboard') {
    json(['data' => dashboard_summary()]);
}

// GET /api/tasks
if ($path === '/api/tasks') {
    $tasks = tasks_all();
    json(['data' => $tasks, 'meta' => ['total' => count($tasks)]]);
}

// GET /api/tasks/{tracking}
if (preg_match('#^/api/tasks/([^/]+)$#', $path, $matches) === 1) {
    $task = tasks_find(rawurldecode($matches[1]));
    if ($task === null) {
        json(['error' => 'Tugas tidak ditemukan'], 404);
    }
    json(['data' => $task]);
}

// GET /api/exceptions
if ($path === '/api/exceptions') {
    $rows = exceptions_all();
    json(['data' => $rows, 'meta' => ['total' => count($rows)]]);
}

// GET /api/exceptions/{id}
if (preg_match('#^/api/exceptions/([^/]+)$#', $path, $matches) === 1) {
    $row = exceptions_find(rawurldecode($matches[1]));
    if ($row === null) {
        json(['error' => 'Pengecualian tidak ditemukan'], 404);
    }
    json(['data' => $row]);
}

// GET /api/radius-segments
if ($path === '/api/radius-segments') {
    json(['data' => radius_segments(), 'meta' => radius_meta()]);
}

json(['error' => 'Endpoint tidak ditemukan', 'path' => $path], 404);
