<?php

namespace App\Support\Geo;

/**
 * Canonical mapping between service-area codes and the presentation labels /
 * region ids used by the UI. Unknown codes fall back to the default area so
 * historical rows always render.
 */
final class ServiceAreas
{
    private const DEFAULT_CODE = 'JKS';

    /**
     * @var array<string, array{region: string, label: string, regencyId: string}>
     */
    private const AREAS = [
        'JKS' => ['region' => 'jaksel', 'label' => 'Jak-Sel', 'regencyId' => '3171'],
        'JKT' => ['region' => 'jaktim', 'label' => 'Jak-Tim', 'regencyId' => '3172'],
        'JKP' => ['region' => 'jakpus', 'label' => 'Jak-Pus', 'regencyId' => '3173'],
        'JKB' => ['region' => 'jakbar', 'label' => 'Jak-Bar', 'regencyId' => '3174'],
    ];

    /**
     * @return array{region: string, label: string, regencyId: string}
     */
    public static function fromCode(?string $code): array
    {
        return self::AREAS[$code] ?? self::AREAS[self::DEFAULT_CODE];
    }

    public static function codeForRegency(?string $regencyId): ?string
    {
        foreach (self::AREAS as $code => $area) {
            if ($area['regencyId'] === $regencyId) {
                return $code;
            }
        }

        return null;
    }
}
