<?php

declare(strict_types=1);

namespace Anteraja\Repositories;

/**
 * Sumber data pengiriman untuk dashboard admin.
 *
 * Bentuk tiap baris persis mengikuti tipe `DeliveryRow` di frontend
 * (src/types.ts) supaya tidak perlu mapping tambahan di sisi TypeScript.
 */
final class ShipmentRepository
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        return [
            [
                'id' => 'ANT-INST-882910412',
                'courierName' => 'Satria Dimas',
                'courierCode' => '#STR-4021',
                'tracking' => 'ANT-INST-882910412',
                'service' => 'instant',
                'flag' => 'review',
                'statusLabel' => 'Perlu Tinjauan (+52 m)',
                'statusTone' => 'amber',
                'region' => 'jaksel',
                'regionLabel' => 'Jak-Sel',
                'regencyId' => '3171',
                'recipient' => 'Bpk. Bambang Wijaya',
                'address' => 'Jl. Senopati No. 42, Kebayoran Baru',
                'href' => '/admin/audit-trail',
                'highlight' => true,
            ],
            [
                'id' => 'ANT-INST-8829104',
                'courierName' => 'Ahmad Satria',
                'courierCode' => '#STR-4821',
                'tracking' => 'ANT-INST-8829104',
                'service' => 'instant',
                'flag' => 'delivered',
                'statusLabel' => 'Terverifikasi (+12 m)',
                'statusTone' => 'emerald',
                'region' => 'jaksel',
                'regionLabel' => 'Jak-Sel',
                'regencyId' => '3171',
                'recipient' => 'Ibu Sarah Amelia',
                'address' => 'Pacific Place Tower 2 Lt. 14, SCBD',
                'href' => '/admin/audit-trail',
                'highlight' => false,
            ],
            [
                'id' => 'ANT-SAME-771920412',
                'courierName' => 'Rizky Pratama',
                'courierCode' => '#STR-3390',
                'tracking' => 'ANT-SAME-771920412',
                'service' => 'sameday',
                'flag' => 'delivered',
                'statusLabel' => 'Terverifikasi',
                'statusTone' => 'emerald',
                'region' => 'jaksel',
                'regionLabel' => 'Jak-Sel',
                'regencyId' => '3171',
                'recipient' => 'Toko Buku Horizon',
                'address' => 'Jl. Gunawarman No. 18, Kebayoran Baru',
                'href' => '/admin/audit-trail',
                'highlight' => false,
            ],
            [
                'id' => 'ANT-INST-99201',
                'courierName' => 'Budi Pratama',
                'courierCode' => '#STR-8821',
                'tracking' => 'ANT-INST-99201',
                'service' => 'instant',
                'flag' => 'exception',
                'statusLabel' => 'Pengecualian Menunggu',
                'statusTone' => 'orange',
                'region' => 'jaksel',
                'regionLabel' => 'Jak-Sel',
                'regencyId' => '3171',
                'recipient' => 'Bpk. Hendra Kusuma',
                'address' => 'Pos Satpam Cluster, Jl. Wijaya II',
                'href' => '/admin/pengecualian-detail',
                'highlight' => false,
            ],
            [
                'id' => 'ANT-REG-554109823',
                'courierName' => 'Dewi Lestari',
                'courierCode' => '#STR-1188',
                'tracking' => 'ANT-REG-554109823',
                'service' => 'regular',
                'flag' => 'review',
                'statusLabel' => 'Perlu Tinjauan (PIN gagal)',
                'statusTone' => 'amber',
                'region' => 'jakpus',
                'regionLabel' => 'Jak-Pus',
                'regencyId' => '3173',
                'recipient' => 'Ibu Ratna Sari',
                'address' => 'Jl. Cendana No. 7, Menteng',
                'href' => '/admin/audit-trail',
                'highlight' => false,
            ],
            [
                'id' => 'ANT-SAME-220193',
                'courierName' => 'Fajar Nugroho',
                'courierCode' => '#STR-2055',
                'tracking' => 'ANT-SAME-220193',
                'service' => 'sameday',
                'flag' => 'delivered',
                'statusLabel' => 'Terverifikasi',
                'statusTone' => 'emerald',
                'region' => 'jaksel',
                'regionLabel' => 'Jak-Sel',
                'regencyId' => '3171',
                'recipient' => 'PT Maju Jaya Abadi',
                'address' => 'Jl. Jend. Sudirman Kav. 52, SCBD',
                'href' => '/admin/audit-trail',
                'highlight' => false,
            ],
        ];
    }

    /**
     * Mencari satu shipment berdasarkan id atau nomor resi (case-insensitive).
     *
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

    /**
     * Detail tambahan per pengiriman: timeline, milestone audit, geofence, POD.
     *
     * @return array<string, mixed>|null
     */
    public function detail(string $tracking): ?array
    {
        $row = $this->find($tracking);
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
}
