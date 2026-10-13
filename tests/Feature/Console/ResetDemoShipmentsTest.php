<?php

namespace Tests\Feature\Console;

use App\Models\PinChallenge;
use App\Models\Shipment;
use App\Services\Verification\PinService;
use Database\Seeders\AnterajaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResetDemoShipmentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
    }

    /**
     * A dataset seeded before the demo PIN was fixed carries a hash that
     * rejects the code the courier screen publishes, so resetting the
     * challenge state alone is not enough to replay the flow.
     */
    public function test_it_reissues_the_published_demo_pin(): void
    {
        $shipment = Shipment::query()
            ->where('tracking_number', 'AJ2509000011')
            ->firstOrFail();

        PinChallenge::query()->where('shipment_id', $shipment->id)->update([
            'code_hash' => hash('sha256', 'pin:160746'),
            'attempts' => 2,
            'status' => 'locked',
            'locked_at' => now(),
        ]);

        $this->artisan('demo:reset-shipments', [
            'shipments' => ['AJ2509000011'],
        ])->assertSuccessful();

        $challenge = $shipment->refresh()->pinChallenge;

        $this->assertSame('pending', $challenge->status);
        $this->assertSame(0, (int) $challenge->attempts);
        $this->assertSame(PinService::demoHash(), $challenge->code_hash);

        $result = app(PinService::class)->verify(
            $shipment->refresh(),
            $shipment->courier,
            PinService::demoCode(),
        );

        $this->assertSame('verified', $result['status']);
    }
}
