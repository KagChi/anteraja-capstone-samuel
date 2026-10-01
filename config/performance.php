<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Read Cache TTL
    |--------------------------------------------------------------------------
    |
    | How long the presentation caches (shipments, dashboard, radius, pending
    | exception count) stay warm. They are also invalidated explicitly on every
    | write, so this is a safety-net upper bound rather than the source of
    | freshness. Kept long enough that the `app:warm-cache` command (run on
    | start and by the scheduler) keeps hot endpoints served from cache.
    |
    */
    'cache_ttl' => (int) env('PERFORMANCE_CACHE_TTL', 300),
];
