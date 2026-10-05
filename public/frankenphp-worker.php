<?php

// Worker-mode entrypoint used by FrankenPHP through Laravel Octane. FrankenPHP
// boots this script once and reuses the booted Laravel application across
// requests instead of paying a full framework boot per request.
//
// The Docker image starts it with:
//   php artisan octane:frankenphp --host=0.0.0.0 --port=8080

// Set a default for the application base path and public path if they are missing...
$_SERVER['APP_BASE_PATH'] = $_ENV['APP_BASE_PATH'] ?? $_SERVER['APP_BASE_PATH'] ?? __DIR__.'/..';
$_SERVER['APP_PUBLIC_PATH'] = $_ENV['APP_PUBLIC_PATH'] ?? $_SERVER['APP_PUBLIC_PATH'] ?? __DIR__;

require __DIR__.'/../vendor/laravel/octane/bin/frankenphp-worker.php';
