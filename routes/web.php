<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Landing'))->name('landing');

Route::prefix('courier')->name('courier.')->group(function () {
    Route::get('tugas', fn () => Inertia::render('Courier/Tasks'))->name('tasks');
    Route::get('verifikasi', fn () => Inertia::render('Courier/Verification'))->name('verification');
    Route::get('bukti-foto', fn () => Inertia::render('Courier/ProofPhoto'))->name('proof-photo');
    Route::get('sukses', fn () => Inertia::render('Courier/Success'))->name('success');
});

Route::get('shipments', fn () => Inertia::render('Shipments/List'))->name('shipments.index');
Route::get('shipments/{id}', fn (string $id) => Inertia::render('Shipments/Detail', [
    'id' => $id,
]))->name('shipments.show');

Route::prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/dashboard');
    Route::get('dashboard', fn () => Inertia::render('Admin/Dashboard'))->name('dashboard');
    Route::get('audit-trail/{id}', fn (string $id) => Inertia::render('Admin/AuditTrail', [
        'id' => $id,
    ]))->name('audit-trail');
    Route::get('antrian-pengecualian', fn () => Inertia::render('Admin/ExceptionQueue'))->name('exception-queue');
    Route::get('pengecualian-detail/{id}', fn (string $id) => Inertia::render('Admin/ExceptionDetail', [
        'id' => $id,
    ]))->name('exception-detail');
    Route::get('pengaturan-radius', fn () => Inertia::render('Admin/RadiusSettings'))->name('radius-settings');
});

Route::fallback(fn () => Inertia::render('NotFound'));
