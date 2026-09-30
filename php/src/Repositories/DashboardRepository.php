<?php

declare(strict_types=1);

namespace Anteraja\Repositories;

/**
 * Ringkasan dashboard admin.
 */
final class DashboardRepository
{
    public function __construct(private readonly ShipmentRepository $shipments) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $reviewCount = 0;
        foreach ($this->shipments->all() as $row) {
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
}
