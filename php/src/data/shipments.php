<?php

declare(strict_types=1);

/**
 * Data dummy pengiriman untuk dashboard admin.
 *
 * Bentuk tiap baris persis mengikuti tipe `DeliveryRow` di frontend
 * (src/types.ts) supaya tidak perlu mapping tambahan di sisi TypeScript.
 *
 * @return array<int, array<string, mixed>>
 */
function shipments_all(): array
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
function shipments_find(string $id): ?array
{
    $needle = strtolower(trim($id));

    foreach (shipments_all() as $row) {
        if (strtolower((string) $row['id']) === $needle
            || strtolower((string) $row['tracking']) === $needle) {
            return $row;
        }
    }

    return null;
}
