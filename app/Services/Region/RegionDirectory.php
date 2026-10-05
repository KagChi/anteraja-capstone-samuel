<?php

namespace App\Services\Region;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Server-side proxy for the Indonesian region directory upstreams (wilayah
 * provinces/regencies and postal-code search). Browsers only ever talk to
 * our own API, which avoids third-party CORS policies and lets the answers
 * be cached — the data is effectively static.
 */
class RegionDirectory
{
    private const AREA_TTL_SECONDS = 604800; // 7 days

    private const POSTAL_TTL_SECONDS = 86400; // 1 day

    /**
     * @return array<int, array<string, mixed>>
     */
    public function provinces(): array
    {
        return Cache::remember('regions.provinces', self::AREA_TTL_SECONDS, function (): array {
            return $this->fetchWilayah('/provinces.json');
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function regencies(string $provinceId): array
    {
        return Cache::remember("regions.regencies.{$provinceId}", self::AREA_TTL_SECONDS, function () use ($provinceId): array {
            return $this->fetchWilayah("/regencies/{$provinceId}.json");
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function postal(string $query): array
    {
        $key = 'postal.'.sha1(mb_strtolower(trim($query)));

        return Cache::remember($key, self::POSTAL_TTL_SECONDS, function () use ($query): array {
            $payload = $this->request()
                ->get($this->base('services.kodepos.base').'/search', ['q' => $query])
                ->json();

            return is_array($payload) && is_array($payload['data'] ?? null) ? $payload['data'] : [];
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fetchWilayah(string $path): array
    {
        $payload = $this->request()
            ->get($this->base('services.wilayah.base').$path)
            ->json();

        if (! is_array($payload)) {
            throw new RuntimeException('Unexpected wilayah payload for '.$path);
        }

        return array_values($payload);
    }

    private function request(): PendingRequest
    {
        return Http::acceptJson()->timeout(10)->retry(2, 250);
    }

    private function base(string $configKey): string
    {
        return rtrim((string) config($configKey), '/');
    }
}
