<?php

declare(strict_types=1);

/**
 * Front controller API — titik komposisi (composition root).
 *
 * Semua dependensi class disusun di sini, lalu Router memetakan path ke
 * method controller. Skema JSON respons dipertahankan sama seperti sebelumnya.
 */

require __DIR__.'/../src/bootstrap.php';

use Anteraja\Controllers\DashboardController;
use Anteraja\Controllers\ExceptionController;
use Anteraja\Controllers\HealthController;
use Anteraja\Controllers\QuoteController;
use Anteraja\Controllers\RadiusController;
use Anteraja\Controllers\ShipmentController;
use Anteraja\Controllers\TaskController;
use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Http\Router;
use Anteraja\Repositories\DashboardRepository;
use Anteraja\Repositories\ExceptionRepository;
use Anteraja\Repositories\RadiusRepository;
use Anteraja\Repositories\ShipmentRepository;
use Anteraja\Repositories\TaskRepository;
use Anteraja\Services\ShippingCalculator;

Response::cors();

// --- Composition root --------------------------------------------------------
$shipments = new ShipmentRepository();

$healthController = new HealthController();
$shipmentController = new ShipmentController($shipments);
$taskController = new TaskController(new TaskRepository());
$exceptionController = new ExceptionController(new ExceptionRepository());
$radiusController = new RadiusController(new RadiusRepository());
$dashboardController = new DashboardController(new DashboardRepository($shipments));
$quoteController = new QuoteController(new ShippingCalculator());

// --- Rute --------------------------------------------------------------------
$router = new Router();

$router->get('/api/health', [$healthController, 'index']);
$router->get('/', [$healthController, 'index']);

$router->get('/api/shipments', [$shipmentController, 'index']);
$router->get('/api/shipments/{id}', [$shipmentController, 'show']);

$router->get('/api/shipping/quote', [$quoteController, 'index']);

$router->get('/api/dashboard', [$dashboardController, 'index']);

$router->get('/api/tasks', [$taskController, 'index']);
$router->get('/api/tasks/{tracking}', [$taskController, 'show']);

$router->get('/api/exceptions', [$exceptionController, 'index']);
$router->get('/api/exceptions/{id}', [$exceptionController, 'show']);

$router->get('/api/radius-segments', [$radiusController, 'index']);

$router->dispatch(Request::fromGlobals());
