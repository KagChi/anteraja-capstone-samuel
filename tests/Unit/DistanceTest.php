<?php

namespace Tests\Unit;

use App\Support\Geo\Distance;
use PHPUnit\Framework\TestCase;

class DistanceTest extends TestCase
{
    public function test_same_point_is_zero_meters(): void
    {
        $this->assertSame(0, Distance::haversineMeters(-6.2, 106.8, -6.2, 106.8));
    }

    public function test_one_thousandth_degree_latitude_is_about_111_meters(): void
    {
        $meters = Distance::haversineMeters(-6.2000, 106.8000, -6.2010, 106.8000);

        $this->assertGreaterThan(100, $meters);
        $this->assertLessThan(120, $meters);
    }

    public function test_labels_switch_from_meters_to_kilometers(): void
    {
        $this->assertSame('500 m', Distance::label(500));
        $this->assertSame('1,5 km', Distance::label(1500));
        $this->assertSame('2 km', Distance::label(2000));
    }
}
