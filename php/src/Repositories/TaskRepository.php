<?php

declare(strict_types=1);

namespace Anteraja\Repositories;

/**
 * Sumber data tugas kurir (mobile).
 */
final class TaskRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return [
            [
                'tracking' => 'ANT-INST-882910394',
                'category' => 'instant',
                'recipient' => 'Bpk. Bambang Wijaya',
                'address' => 'Jl. Senopati No. 42, Kebayoran Baru',
                'distance' => '250 m',
                'eta' => '4 mnt',
                'badges' => [
                    ['label' => 'Instant', 'tone' => 'service-instant'],
                    ['label' => 'Perlu PIN', 'tone' => 'pin'],
                ],
                'footerNote' => null,
                'cta' => 'Mulai Antar',
                'geofence' => [
                    'distanceMeters' => 28,
                    'deviationMeters' => 12,
                    'radiusMeters' => 30,
                    'point' => 'Jl. Senopati No. 42',
                ],
            ],
            [
                'tracking' => 'ANT-SAME-771920412',
                'category' => 'sameday',
                'recipient' => 'Ibu Sarah Amelia',
                'address' => 'Pacific Place Tower 2 Lt. 14, SCBD',
                'distance' => '1.4 km',
                'eta' => '12 mnt',
                'badges' => [
                    ['label' => 'Same-Day', 'tone' => 'service-sameday'],
                    ['label' => 'Stop #2', 'tone' => 'note'],
                ],
                'footerNote' => 'Maks. 14:00',
                'cta' => null,
            ],
            [
                'tracking' => 'ANT-SAME-554109823',
                'category' => 'sameday',
                'recipient' => 'Toko Buku Horizon',
                'address' => 'Jl. Gunawarman No. 18, Kebayoran Baru',
                'distance' => '2.8 km',
                'eta' => '20 mnt',
                'badges' => [
                    ['label' => 'Same-Day', 'tone' => 'service-sameday'],
                    ['label' => 'COD Rp148.000', 'tone' => 'pill'],
                ],
                'footerNote' => 'Stop #3',
                'cta' => null,
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $tracking): ?array
    {
        $needle = strtolower(trim($tracking));

        foreach ($this->all() as $task) {
            if (strtolower((string) $task['tracking']) === $needle) {
                return $task;
            }
        }

        return null;
    }
}
