<?php

namespace Tests\Feature\Api;

use App\Models\Shipment;
use App\Models\User;
use App\Services\Delivery\DashboardService;
use App\Support\Presentation\DeliveryPresenter;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Guards the response-time optimisations: the dashboard must not hydrate
 * every shipment, and list endpoints must stay bounded.
 */
class PerformanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
        Cache::flush();
    }

    public function test_dashboard_summary_runs_a_single_query(): void
    {
        DB::enableQueryLog();

        $summary = app(DashboardService::class)->summary();

        $queries = DB::getQueryLog();
        DB::disableQueryLog();

        $this->assertCount(1, $queries);
        $this->assertArrayHasKey('total', $summary);
        $this->assertArrayHasKey('reviewCount', $summary);
        $this->assertArrayHasKey('verifiedCount', $summary);
    }

    public function test_dashboard_summary_matches_presenter_flag_semantics(): void
    {
        $expectedVerified = 0;
        $expectedReview = 0;

        Shipment::withPresentation()->get()->each(function (Shipment $shipment) use (&$expectedVerified, &$expectedReview): void {
            $flag = DeliveryPresenter::flag($shipment);

            if ($flag === 'delivered') {
                $expectedVerified++;
            } elseif ($flag === 'review') {
                $expectedReview++;
            }
        });

        $summary = app(DashboardService::class)->summary();

        $this->assertSame(Shipment::count(), $summary['total']);
        $this->assertSame($expectedVerified, $summary['verifiedCount']);
        $this->assertSame($expectedReview, $summary['reviewCount']);
    }

    public function test_list_projection_matches_relation_backed_rows(): void
    {
        $expected = Shipment::withPresentation()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Shipment $shipment) => DeliveryPresenter::row($shipment))
            ->values()
            ->all();

        $actual = Shipment::query()
            ->forListPresentation()
            ->orderByDesc('shipments.created_at')
            ->get()
            ->map(fn (object $shipment) => DeliveryPresenter::rowFromList($shipment))
            ->values()
            ->all();

        $this->assertEquals($expected, $actual);
    }

    public function test_shipments_index_is_bounded_by_per_page(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->firstOrFail();

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/shipments?per_page=2')
            ->assertOk();

        $this->assertCount(2, $response->json('data'));
        $this->assertSame(2, $response->json('meta.per_page'));
    }

    public function test_shipments_index_caps_per_page(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->firstOrFail();

        $this->actingAs($admin)
            ->getJson('/api/v1/shipments?per_page=9999')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 500);
    }
}
