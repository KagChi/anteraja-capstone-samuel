<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Every list endpoint that feeds a data table is keyset ("cursor") paginated.
 */
class ListCursorPaginationTest extends TestCase
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

    private function courier(): User
    {
        return User::where('role', User::ROLE_COURIER)->firstOrFail();
    }

    public function test_admin_exceptions_are_cursor_paginated(): void
    {
        $first = $this->actingAs($this->admin())
            ->getJson('/api/v1/admin/exceptions?per_page=2')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.has_more', true);

        $this->assertCount(2, $first->json('data'));

        $cursor = $first->json('meta.next_cursor');
        $this->assertNotNull($cursor);

        $second = $this->actingAs($this->admin())
            ->getJson('/api/v1/admin/exceptions?per_page=2&cursor='.urlencode($cursor))
            ->assertOk();

        $firstTrackings = array_column($first->json('data'), 'tracking');
        $secondTrackings = array_column($second->json('data'), 'tracking');

        $this->assertSame([], array_intersect($firstTrackings, $secondTrackings));
    }

    public function test_admin_exceptions_can_filter_by_status(): void
    {
        $response = $this->actingAs($this->admin())
            ->getJson('/api/v1/admin/exceptions?status=pending&per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 10);

        $rows = $response->json('data');

        $this->assertCount(10, $rows);

        foreach ($rows as $row) {
            $this->assertSame('pending', $row['status']);
        }
    }

    public function test_courier_tasks_are_cursor_paginated_without_overlap(): void
    {
        $url = '/api/v1/courier/tasks?per_page=10';

        $seen = [];
        $pages = 0;
        $response = $this->actingAs($this->courier())->getJson($url)->assertOk();

        do {
            foreach ($response->json('data') as $task) {
                $seen[] = $task['tracking'];
            }

            $cursor = $response->json('meta.next_cursor');
            $pages++;

            if ($cursor) {
                $response = $this->actingAs($this->courier())
                    ->getJson($url.'&cursor='.urlencode($cursor))
                    ->assertOk();
            }

            $this->assertLessThan(500, $pages, 'Task pagination did not terminate.');
        } while ($cursor);

        $this->assertGreaterThan(0, count($seen));
        $this->assertSame(count($seen), count(array_unique($seen)));
    }
}
