<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminFlowTest extends TestCase
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

    public function test_courier_cannot_reach_admin_api(): void
    {
        $courier = User::where('role', User::ROLE_COURIER)->firstOrFail();

        $this->actingAs($courier)
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);
    }

    public function test_admin_sees_dashboard_and_decides_an_exception(): void
    {
        $this->actingAs($this->admin());

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true);

        $pending = collect($this->getJson('/api/v1/admin/exceptions')->json('data'))
            ->firstWhere('status', 'pending');
        $this->assertNotNull($pending);

        $this->postJson('/api/v1/admin/exceptions/'.$pending['tracking'].'/decision', [
            'decision' => 'approved',
            'note' => 'Deviasi wajar di lobi gedung.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_admin_can_update_and_read_back_radius(): void
    {
        $this->actingAs($this->admin());

        $this->putJson('/api/v1/admin/radius-segments', [
            'service_type' => 'instant',
            'radius_m' => 35,
        ])->assertOk();

        $instant = collect($this->getJson('/api/v1/admin/radius-segments')->json('data'))
            ->firstWhere('id', 'radius-instant');

        $this->assertSame(35, $instant['defaultValue']);
    }
}
