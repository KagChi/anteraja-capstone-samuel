<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Services\Region\RegionDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Same-origin region endpoints consumed by the console/courier apps; the
 * upstream third-party APIs are only reached from the server (no browser
 * CORS involved).
 */
class RegionController extends Controller
{
    use RespondsWithEnvelope;

    private const MIN_POSTAL_QUERY_LENGTH = 3;

    public function provinces(RegionDirectory $regions): JsonResponse
    {
        return $this->proxied(fn () => $regions->provinces());
    }

    public function regencies(string $province, RegionDirectory $regions): JsonResponse
    {
        if (preg_match('/^[0-9]{2}$/', $province) !== 1) {
            return $this->fail('VALIDATION_ERROR', 'Kode provinsi tidak valid.', 422);
        }

        return $this->proxied(fn () => $regions->regencies($province));
    }

    public function postal(Request $request, RegionDirectory $regions): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < self::MIN_POSTAL_QUERY_LENGTH) {
            return $this->fail('VALIDATION_ERROR', 'Kata kunci minimal 3 karakter.', 422);
        }

        return $this->proxied(fn () => $regions->postal($query));
    }

    /**
     * @param  callable(): array<int, array<string, mixed>>  $callback
     */
    private function proxied(callable $callback): JsonResponse
    {
        try {
            return $this->ok($callback());
        } catch (Throwable $error) {
            report($error);

            return $this->fail('UPSTREAM_UNAVAILABLE', 'Data wilayah sedang tidak tersedia. Coba lagi.', 502);
        }
    }
}
