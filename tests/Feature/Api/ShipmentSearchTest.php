<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The shipment tables filter and search on the server; the client only
 * renders the returned page.
 */
class ShipmentSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
    }

    private function admin(): User
    {
        return User::where('role', User::ROLE_ADMIN)->firstOrFail();
    }

    public function test_search_matches_the_tracking_number(): void
    {
        $this->actingAs($this->admin());

        $rows = $this->getJson('/api/v1/shipments?search=AJ2509001001')->json('data');

        $this->assertCount(1, $rows);
        $this->assertSame('AJ2509001001', $rows[0]['tracking']);
    }

    public function test_search_matches_courier_and_recipient(): void
    {
        $this->actingAs($this->admin());

        $byCourier = $this->getJson('/api/v1/shipments?search=STR-001&per_page=25')->json('data');
        $this->assertNotEmpty($byCourier);
        foreach ($byCourier as $row) {
            $this->assertSame('#STR-001', $row['courierCode']);
        }

        $byRecipient = $this->getJson('/api/v1/shipments?search=Fajar&per_page=25')->json('data');
        $this->assertNotEmpty($byRecipient);
        $this->assertContains('Fajar Nugraha', array_column($byRecipient, 'recipient'));
    }

    public function test_status_filter_matches_the_presenter_flags(): void
    {
        $this->actingAs($this->admin());

        $delivered = $this->getJson('/api/v1/shipments?status=delivered&per_page=25')->json('data');
        $this->assertNotEmpty($delivered);
        foreach ($delivered as $row) {
            $this->assertSame('delivered', $row['flag']);
        }

        $review = $this->getJson('/api/v1/shipments?status=review&per_page=25')->json('data');
        $this->assertNotEmpty($review);
        foreach ($review as $row) {
            $this->assertSame('review', $row['flag']);
        }
    }

    public function test_service_and_region_filters(): void
    {
        $this->actingAs($this->admin());

        $instant = $this->getJson('/api/v1/shipments?service=instant&per_page=25')->json('data');
        $this->assertNotEmpty($instant);
        foreach ($instant as $row) {
            $this->assertSame('instant', $row['service']);
        }

        $jaksel = $this->getJson('/api/v1/shipments?region=3171&per_page=25')->json('data');
        $this->assertNotEmpty($jaksel);
        foreach ($jaksel as $row) {
            $this->assertSame('jaksel', $row['region']);
        }
    }

    public function test_filters_compose_with_cursor_pagination(): void
    {
        $this->actingAs($this->admin());

        $first = $this->getJson('/api/v1/shipments?status=review&per_page=10')->json();
        $this->assertNotEmpty($first['data']);

        if ($first['meta']['next_cursor'] === null) {
            $this->assertNull($first['meta']['next_cursor']);

            return;
        }

        $second = $this->getJson(
            '/api/v1/shipments?status=review&per_page=10&cursor='.urlencode((string) $first['meta']['next_cursor']),
        )->json();

        $this->assertNotEmpty($second['data']);
        $this->assertNotSame($first['data'][0]['id'], $second['data'][0]['id']);
    }

    public function test_unknown_filter_values_are_ignored(): void
    {
        $this->actingAs($this->admin());

        $response = $this->getJson('/api/v1/shipments?status=bogus&service=bogus&region=0000&per_page=5');

        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_courier_tasks_share_the_same_filters(): void
    {
        $courier = User::where('role', User::ROLE_COURIER)->firstOrFail();
        $this->actingAs($courier);

        $byTracking = $this->getJson('/api/v1/courier/tasks?search=AJ2509001001')->json('data');
        $this->assertCount(1, $byTracking);
        $this->assertSame('AJ2509001001', $byTracking[0]['tracking']);

        $instant = $this->getJson('/api/v1/courier/tasks?service=instant&per_page=25')->json('data');
        $this->assertNotEmpty($instant);
        foreach ($instant as $task) {
            $this->assertSame('instant', $task['category']);
        }
    }
}
