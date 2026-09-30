<?php

declare(strict_types=1);

/**
 * Kalkulator tarif pengiriman Anteraja.
 *
 * Tier mengikuti segmen layanan proyek (instant / sameday / regular / kargo);
 * tier mana yang berlaku ditentukan oleh BERAT via if/elseif.
 * Hari ini murni fungsi prosedural — besok siap dibungkus ke dalam class.
 */

// --- Konfigurasi global (diakses di dalam fungsi lewat keyword `global`) -----
$DISTANCE_FREE_KM = 5.0;

$tiers = [
    'instant' => [
        'label' => 'Anteraja Instant',
        'maxKg' => 1.0,
        'basePrice' => 12000.0,
        'perKm' => 2500.0,
        'sla' => 'SLA 2-3 Jam',
    ],
    'sameday' => [
        'label' => 'Anteraja Same-Day',
        'maxKg' => 5.0,
        'basePrice' => 20000.0,
        'perKm' => 3000.0,
        'sla' => 'SLA 6-8 Jam',
    ],
    'regular' => [
        'label' => 'Anteraja Reguler',
        'maxKg' => 10.0,
        'basePrice' => 30000.0,
        'perKm' => 4000.0,
        'sla' => 'SLA 1-2 Hari',
    ],
    'kargo' => [
        'label' => 'Anteraja Kargo',
        'maxKg' => null,
        'basePrice' => 50000.0,
        'perKm' => 5000.0,
        'sla' => 'SLA Bulk',
    ],
];

/**
 * Menentukan key tier berdasarkan berat (kondisi if/elseif berurutan).
 *
 * @param array<string, array<string, mixed>> $tiers
 */
function resolveTier(float $weight, array $tiers): string
{
    if ($weight <= 0) {
        throw new InvalidArgumentException('Berat harus lebih dari 0 kg.');
    }

    if ($weight <= $tiers['instant']['maxKg']) {
        return 'instant';
    } elseif ($weight <= $tiers['sameday']['maxKg']) {
        return 'sameday';
    } elseif ($weight <= $tiers['regular']['maxKg']) {
        return 'regular';
    } else {
        return 'kargo';
    }
}

/**
 * Harga dasar tier + biaya tambahan per km setelah jarak gratis.
 */
function calculateTierPrice(float $weight, float $distanceKm): float
{
    global $tiers, $DISTANCE_FREE_KM;

    if ($distanceKm < 0) {
        throw new InvalidArgumentException('Jarak tidak boleh negatif.');
    }

    $tier = resolveTier($weight, $tiers);

    $basePrice = $tiers[$tier]['basePrice'];
    $perKm = $tiers[$tier]['perKm'];
    $billableKm = max(0.0, $distanceKm - $DISTANCE_FREE_KM);

    return $basePrice + ($billableKm * $perKm);
}

/**
 * Memformat angka menjadi Rupiah. Memakai variabel static sebagai penghitung.
 */
function formatCurrency(float $amount): string
{
    static $callCount = 0;
    $callCount++;

    return 'Rp '.number_format($amount, 0, ',', '.');
}

/** Deskripsi lengkap satu shipment — memanggil calculateTierPrice() + formatCurrency(). */
function describeShipment(array $shipment): string
{
    $weight = (float) $shipment['weightKg'];
    $distance = (float) $shipment['distanceKm'];

    $price = calculateTierPrice($weight, $distance);

    return sprintf(
        '%s • %.1f kg • %.1f km → %s',
        (string) $shipment['tracking'],
        $weight,
        $distance,
        formatCurrency($price),
    );
}

/**
 * Menjumlahkan total biaya beberapa shipment secara REKURSIF.
 *
 * @param array<int, array<string, mixed>> $shipments
 */
function sumShipmentTotals(array $shipments, int $index = 0): float
{
    if ($index >= count($shipments)) {
        return 0.0; // base case
    }

    $current = (float) $shipments[$index]['weightKg'];
    $currentDistance = (float) $shipments[$index]['distanceKm'];

    return calculateTierPrice($current, $currentDistance)
        + sumShipmentTotals($shipments, $index + 1);
}

/**
 * Ringkasan tarif untuk API: tier, harga dasar, surcharge jarak, total.
 *
 * @return array<string, mixed>
 */
function quoteShipment(float $weight, float $distanceKm): array
{
    global $tiers;

    $tier = resolveTier($weight, $tiers);
    $total = calculateTierPrice($weight, $distanceKm);

    return [
        'tier' => $tier,
        'label' => $tiers[$tier]['label'],
        'sla' => $tiers[$tier]['sla'],
        'weightKg' => $weight,
        'distanceKm' => $distanceKm,
        'basePrice' => $tiers[$tier]['basePrice'],
        'distanceSurcharge' => $total - $tiers[$tier]['basePrice'],
        'total' => $total,
        'formatted' => formatCurrency($total),
    ];
}
