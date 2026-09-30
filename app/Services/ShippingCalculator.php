<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Shipping tariff calculator ported from the legacy prototype.
 */
class ShippingCalculator
{
    private const DISTANCE_FREE_KM = 5.0;

    /**
     * @var array<string, array{label: string, maxKg: float|null, basePrice: float, perKm: float, sla: string}>
     */
    private const TIERS = [
        'instant' => ['label' => 'Anteraja Instant', 'maxKg' => 1.0, 'basePrice' => 12000.0, 'perKm' => 2500.0, 'sla' => 'SLA 2-3 Jam'],
        'sameday' => ['label' => 'Anteraja Same-Day', 'maxKg' => 5.0, 'basePrice' => 20000.0, 'perKm' => 3000.0, 'sla' => 'SLA 6-8 Jam'],
        'regular' => ['label' => 'Anteraja Reguler', 'maxKg' => 10.0, 'basePrice' => 30000.0, 'perKm' => 4000.0, 'sla' => 'SLA 1-2 Hari'],
        'kargo' => ['label' => 'Anteraja Kargo', 'maxKg' => null, 'basePrice' => 50000.0, 'perKm' => 5000.0, 'sla' => 'SLA Bulk'],
    ];

    public function resolveTier(float $weight): string
    {
        if ($weight <= 0) {
            throw new InvalidArgumentException('Berat harus lebih dari 0 kg.');
        }

        foreach (['instant', 'sameday', 'regular'] as $tier) {
            $max = self::TIERS[$tier]['maxKg'];

            if ($max !== null && $weight <= $max) {
                return $tier;
            }
        }

        return 'kargo';
    }

    public function price(float $weight, float $distanceKm): float
    {
        if ($distanceKm < 0) {
            throw new InvalidArgumentException('Jarak tidak boleh negatif.');
        }

        $tier = $this->resolveTier($weight);
        $base = self::TIERS[$tier]['basePrice'];
        $perKm = self::TIERS[$tier]['perKm'];
        $billable = max(0.0, $distanceKm - self::DISTANCE_FREE_KM);

        return $base + ($billable * $perKm);
    }

    public function formatCurrency(float $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }

    /**
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
