<?php

declare(strict_types=1);

namespace Anteraja\Http;

/**
 * Pembungkus immutable dari request HTTP masuk.
 */
final class Request
{
    /**
     * @param  array<string, mixed>  $query
     */
    public function __construct(
        private readonly string $method,
        private readonly string $path,
        private readonly array $query = [],
    ) {}

    /** Membangun request dari superglobal PHP. */
    public static function fromGlobals(): self
    {
        $path = (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
        $path = rtrim($path, '/');

        return new self(
            strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')),
            $path === '' ? '/' : $path,
            $_GET,
        );
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    /** Mengambil nilai query string sebagai string, atau null bila tidak ada. */
    public function query(string $key): ?string
    {
        $value = $this->query[$key] ?? null;

        return is_string($value) ? $value : null;
    }
}
