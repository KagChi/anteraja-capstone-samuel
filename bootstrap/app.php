<?php

use App\Console\Commands\WarmCache;
use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        WarmCache::class,
    ])
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('app:warm-cache')->everyFiveMinutes()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Cloudflare and ingress-nginx terminate TLS in front of the app, so
        // X-Forwarded-* headers must be trusted for correct URL generation.
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $envelope = new ApiExceptionRenderer;
        $envelope->register($exceptions);
    })->create();
