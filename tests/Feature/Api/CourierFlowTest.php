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

    /**
     * FRD-06 fix-quality signals for a clean device fix.
     *
     * @return array<string, mixed>
     */
    private function gpsSignals(float $latitude, float $longitude, string|int|float $accuracy = 12): array
    {
        $at = now()->toIso8601String();

        return [
            'accuracy' => $accuracy,
            'device_timestamp' => $at,
            'client_flags' => [],
            'fixes' => [[
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy' => $accuracy,
                'timestamp' => $at,
            ]],
        ];
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
            'Grha Pengharapan 2nd Fl, Jl. Denpasar Raya No.2 Blok F3, RT.16/RW.4, Kuningan, East Kuningan, Setiabudi, South Jakarta City, Jakarta 12950',
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
            ...$this->gpsSignals($task['destination']['latitude'], $task['destination']['longitude']),
        ])->assertCreated();

        $this->postJson("/api/v1/courier/tasks/{$tracking}/complete", [
            'latitude' => $task['destination']['latitude'],
            'longitude' => $task['destination']['longitude'],
            ...$this->gpsSignals($task['destination']['latitude'], $task['destination']['longitude']),
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

    public function test_out_of_radius_delivery_records_a_reason_without_waiting_for_approval(): void
    {
        $this->actingAs($this->courier());

        $tracking = $this->getJson('/api/v1/courier/tasks')->json('data.0.tracking');
        $task = $this->getJson("/api/v1/courier/tasks/{$tracking}")->json('data');

        $far = [
            'latitude' => $task['destination']['latitude'] + 0.02,
            'longitude' => $task['destination']['longitude'],
        ];

        // PIN and POD stay mandatory, so prepare them first.
        $code = $this->postJson("/api/v1/courier/tasks/{$tracking}/pin")
            ->json('data.debug_code');
        $this->postJson("/api/v1/courier/tasks/{$tracking}/pin/verify", ['code' => $code])
            ->assertOk();
        $this->post("/api/v1/courier/tasks/{$tracking}/proof", [
            'latitude' => $far['latitude'],
            'longitude' => $far['longitude'],
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
            ...$this->gpsSignals($far['latitude'], $far['longitude']),
        ])->assertCreated();

        // Without a recorded reason the handover is refused …
        $this->postJson("/api/v1/courier/tasks/{$tracking}/complete", [...$far, ...$this->gpsSignals($far['latitude'], $far['longitude'])])
            ->assertStatus(422);

        // The reason is mandatory …
        $this->postJson("/api/v1/courier/tasks/{$tracking}/exception", $far)
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason', 'error.errors');

        // … and a reasoned request is surfaced back on the courier's task.
        $this->postJson("/api/v1/courier/tasks/{$tracking}/exception", [
            ...$far,
            'reason' => 'Lobi gedung dikunci satpam.',
        ])->assertCreated();

        $this->getJson("/api/v1/courier/tasks/{$tracking}")
            ->assertOk()
            ->assertJsonPath('data.exception.status', 'pending')
            ->assertJsonPath('data.exception.reason', 'Lobi gedung dikunci satpam.');

        // Once recorded, the courier may finish without waiting for the
        // admin's decision.
        $this->postJson("/api/v1/courier/tasks/{$tracking}/complete", [...$far, ...$this->gpsSignals($far['latitude'], $far['longitude'])])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');
    }
}
