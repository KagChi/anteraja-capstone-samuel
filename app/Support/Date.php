<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Application timezone helpers (PRD §7: Asia/Jakarta).
 */
class Date
{
    public const TZ = 'Asia/Jakarta';

    private const MONTHS = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'Mei', 6 => 'Jun',
        7 => 'Jul', 8 => 'Agu', 9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    public static function now(): Carbon
    {
        return Carbon::now(self::TZ);
    }

    public static function jakarta(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value)->setTimezone(self::TZ);
    }

    public static function iso(mixed $value): ?string
    {
        return self::jakarta($value)?->toIso8601String();
    }

    public static function timeLabel(mixed $value): string
    {
        $carbon = self::jakarta($value);

        return $carbon ? $carbon->format('H:i').' WIB' : '—';
    }

    public static function dateLabel(mixed $value): string
    {
        $carbon = self::jakarta($value);

        if (! $carbon) {
            return '—';
        }

        return sprintf(
            '%d %s %d',
            $carbon->day,
            self::MONTHS[$carbon->month],
            $carbon->year,
        );
    }

    public static function dateTimeLabel(mixed $value): string
    {
        $carbon = self::jakarta($value);

        return $carbon ? self::dateLabel($carbon).' • '.$carbon->format('H:i').' WIB' : '—';
    }
}
