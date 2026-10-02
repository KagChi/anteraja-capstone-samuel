<?php

namespace App\Support;

/**
 * Opaque keyset-pagination cursor.
 *
 * Encodes the `(created_at, id)` sort position of the last row on a page so
 * the next page can resume with a single `(created_at, id) < (?, ?)` seek
 * instead of an OFFSET scan.
 */
final class Cursor
{
    public static function encode(string $createdAt, string $id): string
    {
        return rtrim(strtr(base64_encode($createdAt.'|'.$id), '+/', '-_'), '=');
    }

    /**
     * @return array{0: string, 1: string}|null [created_at, id] or null when invalid.
     */
    public static function decode(?string $cursor): ?array
    {
        if ($cursor === null || $cursor === '') {
            return null;
        }

        $normalized = strtr($cursor, '-_', '+/');
        $padding = strlen($normalized) % 4;

        if ($padding > 0) {
            $normalized .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($normalized, true);

        if ($decoded === false || ! str_contains($decoded, '|')) {
            return null;
        }

        [$createdAt, $id] = explode('|', $decoded, 2);

        if ($createdAt === '' || $id === '') {
            return null;
        }

        return [$createdAt, $id];
    }
}
