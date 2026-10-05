<?php

use App\Http\Controllers\Api\V1\Admin\AuditExportController;
use App\Http\Controllers\Api\V1\Admin\ClaimCaseController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\ExceptionController as AdminExceptionController;
use App\Http\Controllers\Api\V1\Admin\GpsLockController as AdminGpsLockController;
use App\Http\Controllers\Api\V1\Admin\PinLockController as AdminPinLockController;
use App\Http\Controllers\Api\V1\Admin\ProofPhotoController;
use App\Http\Controllers\Api\V1\Admin\ProofReviewController;
use App\Http\Controllers\Api\V1\Admin\RadiusController;
use App\Http\Controllers\Api\V1\Courier\DeliveryController;
use App\Http\Controllers\Api\V1\Courier\ExceptionController as CourierExceptionController;
use App\Http\Controllers\Api\V1\Courier\GpsLockController as CourierGpsLockController;
use App\Http\Controllers\Api\V1\Courier\HistoryController;
use App\Http\Controllers\Api\V1\Courier\PinController;
use App\Http\Controllers\Api\V1\Courier\ProfileController;
use App\Http\Controllers\Api\V1\Courier\ProofController;
use App\Http\Controllers\Api\V1\Courier\TaskController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\RegionController;
use App\Http\Controllers\Api\V1\ShipmentController;
use App\Http\Controllers\Api\V1\ShippingQuoteController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('web')->group(function () {
    Route::get('health', HealthController::class)->name('api.health');

    // Courier (SATRIA) endpoints.
    Route::middleware(['auth', 'role:courier'])->prefix('courier')->name('api.courier.')->group(function () {
        Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::get('tasks/{tracking}', [TaskController::class, 'show'])->name('tasks.show');
        Route::get('history', HistoryController::class)->name('history');
        Route::get('profile', ProfileController::class)->name('profile');
        Route::post('tasks/{tracking}/pin', [PinController::class, 'store'])->name('pin.store');
        Route::post('tasks/{tracking}/pin/verify', [PinController::class, 'verify'])->name('pin.verify');
        Route::post('tasks/{tracking}/proof', [ProofController::class, 'store'])->name('proof.store');
        Route::post('tasks/{tracking}/exception', [CourierExceptionController::class, 'store'])->name('exception.store');
        Route::post('tasks/{tracking}/gps-lock', [CourierGpsLockController::class, 'store'])->name('gps-lock.store');
        Route::post('tasks/{tracking}/complete', [DeliveryController::class, 'complete'])->name('complete');
    });

    // Shared (courier + admin) read endpoints.
    Route::middleware('auth')->group(function () {
        Route::get('shipments', [ShipmentController::class, 'index'])->name('api.shipments.index');
        Route::get('shipments/{id}', [ShipmentController::class, 'show'])->name('api.shipments.show');
        Route::get('shipping/quote', ShippingQuoteController::class)->name('api.shipping.quote');

        // Same-origin proxies for the region directory upstreams.
        Route::get('regions/provinces', [RegionController::class, 'provinces'])->name('api.regions.provinces');
        Route::get('regions/regencies/{province}', [RegionController::class, 'regencies'])
            ->name('api.regions.regencies');
        Route::get('postal/search', [RegionController::class, 'postal'])->name('api.postal.search');
    });

    // Admin / hub endpoints.
    Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('api.admin.')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
        Route::post('shipments/{id}/close-case', [ClaimCaseController::class, 'close'])->name('shipments.close-case');
        Route::get('shipments/{id}/audit-export', AuditExportController::class)->name('shipments.audit-export');
        Route::get('exceptions', [AdminExceptionController::class, 'index'])->name('exceptions.index');
        Route::get('exceptions/{id}', [AdminExceptionController::class, 'show'])->name('exceptions.show');
        Route::post('exceptions/{id}/decision', [AdminExceptionController::class, 'decide'])->name('exceptions.decide');
        Route::get('gps-locks', [AdminGpsLockController::class, 'index'])->name('gps-locks.index');
        Route::get('gps-locks/{id}', [AdminGpsLockController::class, 'show'])->name('gps-locks.show');
        Route::post('gps-locks/{id}/decision', [AdminGpsLockController::class, 'decide'])->name('gps-locks.decide');
        Route::get('pin-locks', [AdminPinLockController::class, 'index'])->name('pin-locks.index');
        Route::get('pin-locks/{id}', [AdminPinLockController::class, 'show'])->name('pin-locks.show');
        Route::post('pin-locks/{id}/decision', [AdminPinLockController::class, 'decide'])->name('pin-locks.decide');
        Route::get('radius-segments', [RadiusController::class, 'index'])->name('radius.index');
        Route::put('radius-segments', [RadiusController::class, 'update'])->name('radius.update');

        // POD review (FR-02-09) and signed POD photo access (FR-02-06).
        Route::post('proofs/{proof}/review', [ProofReviewController::class, 'review'])->name('proofs.review');
        Route::get('proofs/{proof}/photo', ProofPhotoController::class)
            ->middleware('signed')
            ->name('proofs.photo');
    });
});
