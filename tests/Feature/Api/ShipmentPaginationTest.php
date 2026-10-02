<?php

namespace Tests\Feature\Api;

use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Cursor (keyset) pagination for GET /api/v1/shipments.
 */
class ShipmentPaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
        Cache::flush();
    }

    private function admin(): User
    {
        return User::where('role', User::ROLE_ADMIN)->firstOrFail();
    }

    public function test_first_page_returns_a_cursor_when_more_rows_exist(): void
    {
        $response = $this->actingAs($this->admin())
            ->getJson('/api/v1/shipments?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.has_more', true);

        $this->assertCount(10, $response->json('data'));
        $this->assertNotNull($response->json('meta.next_cursor'));
    }

    public function test_cursor_walks_every_page_without_overlap_until_exhausted(): void
    {
        $seen = [];
        $cursor = null;
        $pages = 0;

        do {
            $url = '/api/v1/shipments?per_page=100'.($cursor ? '&cursor='.urlencode($cursor) : '');

            $response = $this->actingAs($this->admin())->getJson($url)->assertOk();

            foreach ($response->json('data') as $row) {
                $seen[] = $row['id'];
            }

            $cursor = $response->json('meta.next_cursor');
            $pages++;

            $this->assertLessThan(50, $pages, 'Cursor pagination did not terminate.');
        } while ($cursor !== null);

        $this->assertSame(Shipment::count(), count($seen));
        $this->assertSame(count($seen), count(array_unique($seen)));
    }

    public function test_last_page_reports_no_more_rows(): void
    {
        $cursor = null;
        $seen = 0;

        do {
            $url = '/api/v1/shipments?per_page=500'.($cursor ? '&cursor='.urlencode($cursor) : '');

            $response = $this->actingAs($this->admin())->getJson($url)->assertOk();

            $seen += count($response->json('data'));
            $cursor = $response->json('meta.next_cursor');
        } while ($cursor !== null);

        $this->assertSame(Shipment::count(), $seen);
        $this->assertNull($cursor);
    }

    public function test_invalid_cursor_falls_back_to_the_first_page(): void
    {
        $this->actingAs($this->admin())
            ->getJson('/api/v1/shipments?per_page=5&cursor=not-a-real-cursor')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.has_more', true);
    }
}
