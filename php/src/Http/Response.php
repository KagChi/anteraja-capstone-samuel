<?php

declare(strict_types=1);

namespace Anteraja\Http;

/**
 * Pembantu keluaran HTTP untuk API JSON.
 */
final class Response
{
    /** Header CORS supaya endpoint bisa dipanggil langsung tanpa proxy Vite. */
    public static function cors(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Accept');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /** Mengirim payload sebagai JSON lalu menghentikan eksekusi. */
    public static function json(mixed $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT,
        );

        exit;
    }
}
