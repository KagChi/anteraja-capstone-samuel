<?php

declare(strict_types=1);

namespace Anteraja\Repositories;

/**
 * Sumber data pengajuan pengecualian geofence (admin).
 */
final class ExceptionRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return [
            [
                'id' => 'ANT-INST-99201',
                'courierName' => 'Budi Pratama',
                'courierCode' => 'SAT-8821',
                'tracking' => 'ANT-INST-99201',
                'service' => 'instant',
                'deviation' => 64,
                'maxTolerance' => 30,
                'actualDistance' => 94,
                'reason' => 'Gate cluster menutup, akses lewat pos satpam.',
                'ticketAt' => '22 Sep 2024 • 14:41 WIB',
                'ticketIso' => '2024-09-22T14:41:00+07:00',
                'podPoint' => '-6.2418, 106.8086',
                'podCapturedAt' => '22 Sep 2024 • 14:40 WIB',
                'podIso' => '2024-09-22T14:40:00+07:00',
            ],
            [
                'id' => 'ANT-INST-882910412',
                'courierName' => 'Satria Dimas',
                'courierCode' => 'SAT-4021',
                'tracking' => 'ANT-INST-882910412',
                'service' => 'instant',
                'deviation' => 55,
                'maxTolerance' => 30,
                'actualDistance' => 85,
                'reason' => 'Jalan satu arah, harus putar balik ke lobi.',
                'ticketAt' => '22 Sep 2024 • 15:02 WIB',
                'ticketIso' => '2024-09-22T15:02:00+07:00',
                'podPoint' => '-6.2401, 106.8093',
                'podCapturedAt' => '22 Sep 2024 • 15:01 WIB',
                'podIso' => '2024-09-22T15:01:00+07:00',
            ],
            [
                'id' => 'ANT-SAME-771920412',
                'courierName' => 'Rizky Pratama',
                'courierCode' => 'SAT-3390',
                'tracking' => 'ANT-SAME-771920412',
                'service' => 'sameday',
                'deviation' => 41,
                'maxTolerance' => 50,
                'actualDistance' => 91,
                'reason' => 'Drop-off di gerbang tower, satpam tidak izinkan masuk.',
                'ticketAt' => '22 Sep 2024 • 13:20 WIB',
                'ticketIso' => '2024-09-22T13:20:00+07:00',
                'podPoint' => '-6.2088, 106.8212',
                'podCapturedAt' => '22 Sep 2024 • 13:19 WIB',
                'podIso' => '2024-09-22T13:19:00+07:00',
            ],
            [
                'id' => 'ANT-REG-554109823',
                'courierName' => 'Dewi Lestari',
                'courierCode' => 'SAT-1188',
                'tracking' => 'ANT-REG-554109823',
                'service' => 'regular',
                'deviation' => 118,
                'maxTolerance' => 100,
                'actualDistance' => 218,
                'reason' => 'Penerima minta titip di pos lingkungan.',
                'ticketAt' => '22 Sep 2024 • 16:05 WIB',
                'ticketIso' => '2024-09-22T16:05:00+07:00',
                'podPoint' => '-6.1950, 106.8320',
                'podCapturedAt' => '22 Sep 2024 • 16:04 WIB',
                'podIso' => '2024-09-22T16:04:00+07:00',
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(string $id): ?array
    {
        $needle = strtolower(trim($id));

        foreach ($this->all() as $row) {
            if (strtolower((string) $row['id']) === $needle
                || strtolower((string) $row['tracking']) === $needle) {
                return $row;
            }
        }

        return null;
    }
}
