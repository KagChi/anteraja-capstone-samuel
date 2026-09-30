<?php

declare(strict_types=1);

namespace Anteraja\Services;

use InvalidArgumentException;

/**
 * Kalkulator tarif pengiriman Anteraja.
 *
 * Tier mengikuti segmen layanan proyek (instant / sameday / regular / kargo);
 * tier mana yang berlaku ditentukan oleh BERAT via if/elseif.
 */
final class ShippingCalculator
{
    /** Biaya per km tidak dihitung untuk jarak di bawah ambang ini. */
    private const DISTANCE_FREE_KM = 5.0;

    /**
     * @var array<string, array{label: string, maxKg: float|null, basePrice: float, perKm: float, sla: string}>
     */
    private const TIERS = [
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
     */
    public function resolveTier(float $weight): string
    {
        if ($weight <= 0) {
            throw new InvalidArgumentException('Berat harus lebih dari 0 kg.');
        }

        if ($weight <= self::TIERS['instant']['maxKg']) {
            return 'instant';
        } elseif ($weight <= self::TIERS['sameday']['maxKg']) {
            return 'sameday';
        } elseif ($weight <= self::TIERS['regular']['maxKg']) {
            return 'regular';
        } else {
            return 'kargo';
        }
    }

    /**
     * Harga dasar tier + biaya tambahan per km setelah jarak gratis.
     */
    public function price(float $weight, float $distanceKm): float
    {
        if ($distanceKm < 0) {
            throw new InvalidArgumentException('Jarak tidak boleh negatif.');
        }

        $tier = $this->resolveTier($weight);

        $basePrice = self::TIERS[$tier]['basePrice'];
        $perKm = self::TIERS[$tier]['perKm'];
        $billableKm = max(0.0, $distanceKm - self::DISTANCE_FREE_KM);

        return $basePrice + ($billableKm * $perKm);
    }

    /** Memformat angka menjadi Rupiah. */
    public function formatCurrency(float $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }

    /** Deskripsi lengkap satu shipment — memanggil price() + formatCurrency(). */
    public function describe(array $shipment): string
    {
        $weight = (float) $shipment['weightKg'];
        $distance = (float) $shipment['distanceKm'];

        $price = $this->price($weight, $distance);

        return sprintf(
            '%s • %.1f kg • %.1f km → %s',
            (string) $shipment['tracking'],
            $weight,
            $distance,
            $this->formatCurrency($price),
        );
    }

    /**
     * Menjumlahkan total biaya beberapa shipment secara REKURSIF.
     *
     * @param  array<int, array<string, mixed>>  $shipments
     */
    public function sumTotals(array $shipments, int $index = 0): float
    {
        if ($index >= count($shipments)) {
            return 0.0; // base case
        }

        $current = (float) $shipments[$index]['weightKg'];
        $currentDistance = (float) $shipments[$index]['distanceKm'];

        return $this->price($current, $currentDistance)
            + $this->sumTotals($shipments, $index + 1);
    }

    /**
     * Ringkasan tarif untuk API: tier, harga dasar, surcharge jarak, total.
     *
     * @return array<string, mixed>
     */
    public function quote(float $weight, float $distanceKm): array
    {
        $tier = $this->resolveTier($weight);
        $total = $this->price($weight, $distanceKm);

        return [
            'tier' => $tier,
            'label' => self::TIERS[$tier]['label'],
            'sla' => self::TIERS[$tier]['sla'],
            'weightKg' => $weight,
            'distanceKm' => $distanceKm,
            'basePrice' => self::TIERS[$tier]['basePrice'],
            'distanceSurcharge' => $total - self::TIERS[$tier]['basePrice'],
            'total' => $total,
            'formatted' => $this->formatCurrency($total),
        ];
    }
}
