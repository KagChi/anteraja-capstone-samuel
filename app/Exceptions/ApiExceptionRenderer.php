<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Renders every /api response failure using the PRD envelope shape.
 */
class ApiExceptionRenderer
{
    public function register(Exceptions $exceptions): void
    {
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $this->wantsEnvelope($request)) {
                return null;
            }

            [$status, $code, $message, $extra] = $this->map($exception);

            $error = ['code' => $code, 'message' => $message];

            if ($extra !== []) {
                $error['errors'] = $extra;
            }

            return response()->json([
                'success' => false,
                'data' => null,
                'error' => $error,
            ], $status);
        });
    }

    private function wantsEnvelope(Request $request): bool
    {
        return $request->expectsJson() || $request->is('api/*');
    }

    /**
     * @return array{0: int, 1: string, 2: string, 3: array<string, mixed>}
     */
    private function map(Throwable $exception): array
    {
        if ($exception instanceof ValidationException) {
            $errors = $exception->errors();

            return [422, 'VALIDATION_ERROR', (string) collect($errors)->flatten()->first(), $errors];
        }

        return match (true) {
            $exception instanceof AuthenticationException => [
                401,
                'UNAUTHENTICATED',
                'Sesi tidak valid atau telah berakhir.',
                [],
            ],
            // FRD-06: the fake-GPS gate reports its reasons so the courier app
            // can show what tripped the block and offer an admin review.
            $exception instanceof FakeGpsSuspectedException => [
                422,
                'FAKE_GPS_SUSPECTED',
                $exception->getMessage(),
                $exception->reasons(),
            ],
            $exception instanceof AuthorizationException => [
                403,
                'FORBIDDEN',
                $exception->getMessage() !== '' ? $exception->getMessage() : 'Akses ditolak.',
                [],
            ],
            $exception instanceof ModelNotFoundException => [
                404,
                'NOT_FOUND',
                'Sumber daya tidak ditemukan.',
                [],
            ],
            $exception instanceof HttpExceptionInterface => [
                $exception->getStatusCode(),
                'HTTP_'.$exception->getStatusCode(),
                $exception->getMessage() !== '' ? $exception->getMessage() : 'Permintaan gagal.',
                [],
            ],
            default => [
                500,
                'SERVER_ERROR',
                'Terjadi kesalahan pada server.',
                [],
            ],
        };
    }
}
