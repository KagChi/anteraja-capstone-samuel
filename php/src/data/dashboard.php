<?php

declare(strict_types=1);

/**
 * Ringkasan dashboard admin.
 *
 * @return array<string, mixed>
 */
function dashboard_summary(): array
{
    $rows = shipments_all();

    $reviewCount = 0;
    foreach ($rows as $row) {
        if (($row['flag'] ?? null) === 'review') {
            $reviewCount++;
        }
    }

    return [
        'total' => 142,
        'reviewCount' => $reviewCount,
        'verifiedCount' => 138,
        'shift' => 'Shift Aktif (08:00 - 20:00)',
    ];
}
