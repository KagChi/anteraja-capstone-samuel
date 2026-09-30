<?php

namespace Tests\Unit;

use App\Services\ShippingCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class ShippingCalculatorTest extends TestCase
{
    private ShippingCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->calculator = new ShippingCalculator;
    }

    public function test_it_resolves_tiers_by_weight(): void
    {
        $this->assertSame('instant', $this->calculator->resolveTier(0.5));
        $this->assertSame('sameday', $this->calculator->resolveTier(2.0));
        $this->assertSame('regular', $this->calculator->resolveTier(8.0));
        $this->assertSame('kargo', $this->calculator->resolveTier(25.0));
    }

    public function test_it_charges_the_base_price_within_the_free_radius(): void
    {
        $this->assertSame(12000.0, $this->calculator->price(0.5, 3.0));
    }

    public function test_it_adds_a_per_km_surcharge_beyond_five_km(): void
    {
        $this->assertSame(35000.0, $this->calculator->price(2.0, 10.0));
    }

    public function test_it_rejects_non_positive_weight(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->calculator->resolveTier(0.0);
    }
}
