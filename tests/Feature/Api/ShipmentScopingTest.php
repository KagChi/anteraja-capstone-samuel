<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PRD §9 / FR-05-10: courier reads are scoped to the shipments assigned to
 * them; the admin console still sees everything.
 */
class ShipmentScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
    }

    private function courier(): User
    {
        return User::where('role', User::ROLE_COURIER)->firstOrFail();
    }

    private function admin(): User
    {
        return User::where('role', User::ROLE_ADMIN)->firstOrFail();
    }

    public function test_a_courier_only_sees_their_own_shipments_in_the_list(): void
    {
        $courierName = $this->courier()->name;

        $this->actingAs($this->admin());
        $all = $this->getJson('/api/v1/shipments?per_page=500')->assertOk()->json('data');
        $foreign = collect($all)->firstWhere('courierName', '!=', $courierName);

        $this->assertNotNull($foreign, 'The seed should include a shipment owned by another courier.');

        $this->actingAs($this->courier());
        $own = $this->getJson('/api/v1/shipments?per_page=500')->assertOk()->json('data');

        $this->assertNotEmpty($own);

        foreach ($own as $row) {
            $this->assertSame($courierName, $row['courierName']);
        }

        $this->assertNotContains($foreign['tracking'], array_column($own, 'tracking'));
    }

    public function test_a_courier_cannot_read_another_couriers_audit_detail(): void
    {
        $courierName = $this->courier()->name;

        $this->actingAs($this->admin());
        $all = $this->getJson('/api/v1/shipments?per_page=500')->assertOk()->json('data');
        $foreign = collect($all)->firstWhere('courierName', '!=', $courierName);
        $own = collect($all)->firstWhere('courierName', $courierName);

        $this->assertNotNull($foreign);
        $this->assertNotNull($own);

        $this->actingAs($this->courier());
        $this->getJson("/api/v1/shipments/{$foreign['id']}")->assertStatus(404);
        $this->getJson("/api/v1/shipments/{$own['id']}")->assertOk();
    }
}
