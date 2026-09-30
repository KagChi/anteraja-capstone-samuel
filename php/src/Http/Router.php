<?php

declare(strict_types=1);

namespace Anteraja\Http;

/**
 * Router minimalis: memetakan pola path ber-`{param}` ke handler.
 */
final class Router
{
    /**
     * @var list<array{method: string, pattern: string, handler: callable}>
     */
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    private function add(string $method, string $path, callable $handler): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $this->compile($path),
            'handler' => $handler,
        ];
    }

    /**
     * Mengubah `/api/shipments/{id}` menjadi regex dengan grup tangkap.
     */
    private function compile(string $path): string
    {
        $pattern = preg_replace('#\{[a-zA-Z_][a-zA-Z0-9_]*\}#', '([^/]+)', $path);

        return '#^'.$pattern.'$#';
    }

    /**
     * Menjalankan handler yang cocok. Handler bertanggung jawab mengirim
     * respons dan menghentikan eksekusi.
     */
    public function dispatch(Request $request): never
    {
        if ($request->method() !== 'GET') {
            Response::json(['error' => 'Metode tidak diizinkan'], 405);
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method()) {
                continue;
            }

            if (preg_match($route['pattern'], $request->path(), $matches) === 1) {
                array_shift($matches);
                ($route['handler'])($request, ...$matches);
            }
        }

        Response::json([
            'error' => 'Endpoint tidak ditemukan',
            'path' => $request->path(),
        ], 404);
    }
}
