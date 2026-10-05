<?php

namespace App\Support\Presentation;

/**
 * Normalises the detector's snake_case evidence into the camelCase shape the
 * React admin surfaces consume (FRD-06).
 */
final class GpsEvidence
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function reasons(mixed $reasons): array
    {
        if (! is_array($reasons)) {
            return [];
        }

        return array_values(array_filter($reasons, 'is_array'));
    }

    /**
     * @return array{count: int, spanSeconds: int, distinctPoints: int}|null
     */
    public static function fixWindow(mixed $window): ?array
    {
        if (! is_array($window) || ! isset($window['count'])) {
            return null;
        }

        return [
            'count' => (int) ($window['count'] ?? 0),
            'spanSeconds' => (int) ($window['span_seconds'] ?? 0),
            'distinctPoints' => (int) ($window['distinct_points'] ?? 0),
        ];
    }
}
