<?php

declare(strict_types=1);

/**
 * Detail tambahan per pengiriman: timeline, milestone audit, geofence, dan POD.
 *
 * @return array<string, mixed>|null
 */
function shipment_detail(string $tracking): ?array
{
    $row = shipments_find($tracking);
    if ($row === null) {
        return null;
    }

    // Deviasi diambil dari label status, mis. "Terverifikasi (+12 m)".
    $deviation = 12;
    if (preg_match('/(\d+)\s*m/u', (string) $row['statusLabel'], $match) === 1) {
        $deviation = (int) $match[1];
    }

    return [
        'timeline' => [
            ['label' => 'Paket dibuat di Hub Jakarta Selatan', 'time' => '08:10 WIB'],
            ['label' => 'Dijemput kurir Satria', 'time' => '08:24 WIB'],
            ['label' => 'Dalam perjalanan ke alamat tujuan', 'time' => '08:41 WIB'],
            ['label' => 'Serah terima di alamat tujuan', 'time' => '—'],
        ],
        'milestones' => [
            [
                'time' => '14:10 WIB',
                'datetime' => '14:10',
                'text' => 'Paket diambil dari Hub Jak-Sel oleh Satria #4821',
                'accent' => null,
            ],
            [
                'time' => '14:26 WIB',
                'datetime' => '14:26',
                'text' => 'Kurir tiba di Jl. Senopati No. 42 (28 m dari titik tujuan)',
                'accent' => null,
            ],
            [
                'time' => '14:30 WIB',
                'datetime' => '14:30',
                'text' => 'PIN 8391 terverifikasi oleh penerima langsung',
                'accent' => 'tertiary',
            ],
            [
                'time' => '14:32 WIB',
                'datetime' => '14:32',
                'text' => 'Pengiriman dituntaskan dengan toleransi jarak (+'.$deviation.' m)',
                'accent' => 'magenta',
            ],
        ],
        'geofence' => [
            'target' => [-6.2401, 106.8093],
            'courier' => [-6.24005, 106.80938],
            'radiusMeters' => 30,
            'deviationMeters' => $deviation,
            'pointLabel' => 'Lobi Gedung Office Park',
            'analysis' => 'Deviasi +'.$deviation.' m dinilai wajar untuk area drop-off / parkir lobi perkantoran.',
        ],
        'pod' => [
            'photoSeed' => (string) $row['tracking'],
            'capturedTime' => '14:31 WIB',
            'watermark' => '-6.2401, 106.8093 • 22 Sep 2024 15:14 WIB',
            'recipientName' => (string) ($row['recipient'] ?? 'Penerima'),
            'relation' => 'Penerima Langsung',
            'pin' => '8391',
        ],
        'deviationMeters' => $deviation,
        'maxToleranceMeters' => 30,
        'reason' => 'Deviasi dinilai wajar untuk area drop-off / parkir lobi perkantoran.',
        'completedLabel' => 'Selesai 14:32 WIB',
    ];
}
