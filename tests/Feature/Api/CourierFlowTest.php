<?php

namespace Tests\Feature\Api;

use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CourierFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
        Storage::fake('pod');
    }

    private function courier(): User
    {
        return User::where('role', User::ROLE_COURIER)->firstOrFail();
    }

    public function test_guests_receive_an_unauthenticated_envelope(): void
    {
        $this->getJson('/api/v1/courier/tasks')
            ->assertStatus(401)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_tasks_include_destination_coordinates(): void
    {
        $response = $this->actingAs($this->courier())
            ->getJson('/api/v1/courier/tasks')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertNotEmpty($response->json('data'));
        $this->assertArrayHasKey('destination', $response->json('data.0'));
    }

    public function test_seeded_maxy_ai_hub_task_is_available_for_the_demo(): void
    {
        $this->actingAs($this->courier());

        $tasks = $this->getJson('/api/v1/courier/tasks')->json('data');
        $maxy = collect($tasks)->firstWhere('tracking', 'AJ2509001001');

        $this->assertNotNull($maxy, 'The Maxy AI Hub shipment should be seeded for the demo courier.');
        $this->assertSame(
            'Maxy AI Hub, Jl. Prof. Dr. Satrio No. 18, Kuningan, Jakarta Selatan',
            $maxy['address'],
        );
    }

    public function test_demo_recipient_pin_is_fixed_to_123456(): void
    {
        $this->actingAs($this->courier());

        $tracking = $this->getJson('/api/v1/courier/tasks')->json('data.0.tracking');

        $this->postJson("/api/v1/courier/tasks/{$tracking}/pin")
            ->assertCreated()
            ->assertJsonPath('data.debug_code', '123456');

        $this->postJson("/api/v1/courier/tasks/{$tracking}/pin/verify", ['code' => '123456'])
            ->assertOk()
            ->assertJsonPath('data.verified', true);
    }

    public function test_full_delivery_flow_succeeds(): void
    {
        $this->actingAs($this->courier());

        $tracking = $this->getJson('/api/v1/courier/tasks')->json('data.0.tracking');
        $this->assertNotNull($tracking);

        $code = $this->postJson("/api/v1/courier/tasks/{$tracking}/pin")
            ->assertCreated()
            ->json('data.debug_code');
        $this->assertNotNull($code);

        $this->postJson("/api/v1/courier/tasks/{$tracking}/pin/verify", ['code' => $code])
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $task = $this->getJson("/api/v1/courier/tasks/{$tracking}")->json('data');

        $this->post("/api/v1/courier/tasks/{$tracking}/proof", [
            'latitude' => $task['destination']['latitude'],
            'longitude' => $task['destination']['longitude'],
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
        ])->assertCreated();

        $this->postJson("/api/v1/courier/tasks/{$tracking}/complete", [
            'latitude' => $task['destination']['latitude'],
            'longitude' => $task['destination']['longitude'],
        ])->assertOk()->assertJsonPath('data.status', 'delivered');

        $this->assertSame(
            'delivered',
            Shipment::where('tracking_number', $tracking)->value('status'),
        );
    }

    public function test_courier_can_request_an_out_of_radius_exception(): void
    {
        $this->actingAs($this->courier());

        $tracking = $this->getJson('/api/v1/courier/tasks')->json('data.0.tracking');

        $this->postJson("/api/v1/courier/tasks/{$tracking}/exception", [
            'latitude' => -6.30,
            'longitude' => 106.90,
            'reason' => 'Lobi gedung terkunci saat pengantaran.',
        ])->assertCreated();
    }
}
