<?php

declare(strict_types=1);

/**
 * Router untuk PHP built-in server:
 *   php -S 127.0.0.1:8000 -t php/public php/public/router.php
 *
 * Berkas statis yang ada disajikan apa adanya; sisanya diteruskan ke index.php.
 */

$path = (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$file = __DIR__.$path;

if ($path !== '/' && is_file($file)) {
    return false;
}

require __DIR__.'/index.php';
