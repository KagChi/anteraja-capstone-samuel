<?php

namespace Tests\Feature\Api;

use App\Models\DeliveryEvent;
use App\Models\DeliveryProof;
use App\Models\GpsLockRequest;
use App\Models\Shipment;
use App\Models\User;
use App\Support\Date;
use App\Support\Geo\Point;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * FRD-06: fake-GPS detection blocks the POD/completion pair on strong
 * evidence, flags weaker signals without blocking, and reopens the gate once
 * an admin approves the courier's review request.
 */
class FakeGpsDetectionTest extends TestCase
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

    private function admin(): User
    {
        return User::where('role', User::ROLE_ADMIN)->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function task(): array
    {
        $tracking = $this->getJson('/api/v1/courier/tasks')->json('data.0.tracking');

        return $this->getJson("/api/v1/courier/tasks/{$tracking}")->json('data');
    }

    /**
     * A clean fix: realistic accuracy, current device clock, one fix.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function signals(float $latitude, float $longitude, array $overrides = []): array
    {
        $at = Date::now()->toIso8601String();

        return [
            'accuracy' => 12,
            'device_timestamp' => $at,
            'client_flags' => [],
            'fixes' => [[
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy' => 12,
                'timestamp' => $at,
            ]],
            ...$overrides,
        ];
    }

    /**
     * @param  array<string, mixed>  $task
     * @param  array<string, mixed>  $overrides
     */
    private function submitProof(array $task, array $overrides = []): TestResponse
    {
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        return $this->post("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => Date::now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
            ...$this->signals($latitude, $longitude, $overrides),
        ]);
    }

    /**
     * @param  array<string, mixed>  $task
     * @param  array<string, mixed>  $overrides
     */
    private function complete(array $task, array $overrides = [], string $eventType = 'complete'): TestResponse
    {
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        return $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/complete", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            ...$this->signals($latitude, $longitude, $overrides),
        ]);
    }

    public function test_an_implausible_accuracy_blocks_the_pod_capture(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->submitProof($task, ['accuracy' => 0])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'FAKE_GPS_SUSPECTED')
            ->assertJsonPath('error.errors.0.code', 'accuracy_invalid');

        $shipment = Shipment::where('tracking_number', $task['tracking'])->firstOrFail();

        $this->assertSame(0, DeliveryProof::where('shipment_id', $shipment->id)->count());
        $this->assertSame([], Storage::disk('pod')->allFiles());
        $this->assertDatabaseHas('delivery_events', [
            'shipment_id' => $shipment->id,
            'event_type' => 'gps_blocked',
        ]);
        $this->assertDatabaseHas('anomaly_flags', [
            'flag_type' => 'mock_gps_suspected',
            'weight' => 3.00,
            'is_resolved' => false,
        ]);

        $this->getJson("/api/v1/shipments/{$shipment->id}")
            ->assertOk()
            ->assertJsonPath('data.detail.gps.status', 'blocked');
    }

    public function test_a_frozen_fix_window_blocks_the_pod_capture(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $at = Date::now();
        $fixes = [];

        // Mock providers replay byte-identical coordinates while the clock
        // advances; a real receiver always jitters.
        for ($index = 0; $index < 8; $index++) {
            $fixes[] = [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy' => 1.5,
                'timestamp' => $at->copy()->subSeconds(60 - $index * 8)->toIso8601String(),
            ];
        }

        $this->submitProof($task, [
            'accuracy' => 1.5,
            'device_timestamp' => $at->toIso8601String(),
            'fixes' => $fixes,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'FAKE_GPS_SUSPECTED')
            ->assertJsonPath('error.errors.0.code', 'frozen_fix');

        $shipment = Shipment::where('tracking_number', $task['tracking'])->firstOrFail();

        $this->assertSame(0, DeliveryProof::where('shipment_id', $shipment->id)->count());
    }

    public function test_impossible_travel_between_recorded_points_blocks_completion(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $shipment = Shipment::where('tracking_number', $task['tracking'])->firstOrFail();

        $event = DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $shipment->courier_id,
            'event_type' => 'geofence_check',
            'point' => DB::raw(Point::make(
                $task['destination']['latitude'] + 0.3,
                $task['destination']['longitude'],
            )),
            'actor_type' => 'courier',
        ]);
        // Timestamps are persisted as UTC instants (see docs/decisions.md).
        $event->forceFill(['created_at' => Date::now()->subMinutes(3)->utc()])->save();

        // ~33 km in three minutes is impossible on a motorbike. The gate runs
        // before any other completion check, so no POD or PIN is needed.
        $this->complete($task)
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'FAKE_GPS_SUSPECTED')
            ->assertJsonPath('error.errors.0.code', 'impossible_travel');
    }

    public function test_weak_signals_are_flagged_without_blocking(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->submitProof($task, [
            'device_timestamp' => Date::now()->subMinutes(30)->toIso8601String(),
        ])->assertCreated();

        $proof = DeliveryProof::query()->latest('captured_at')->firstOrFail();

        $this->assertSame('needs_review', $proof->review_status);
        $this->assertSame('suspected', $proof->gps_evidence['level']);
        $this->assertSame('clock_skew', $proof->gps_evidence['reasons'][0]['code']);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $proof->shipment_id,
            'flag_type' => 'mock_gps_suspected',
            'weight' => 2.00,
        ]);
        $this->assertDatabaseMissing('delivery_events', ['event_type' => 'gps_blocked']);
    }

    public function test_a_clean_fix_passes_without_any_gps_flag(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->submitProof($task)->assertCreated();

        $proof = DeliveryProof::query()->latest('captured_at')->firstOrFail();

        $this->assertSame('valid', $proof->review_status);
        $this->assertSame('clean', $proof->gps_evidence['level']);
        $this->assertSame(12, $proof->gps_accuracy_m);
        $this->assertDatabaseMissing('anomaly_flags', ['flag_type' => 'mock_gps_suspected']);

        $this->getJson("/api/v1/shipments/{$proof->shipment_id}")
            ->assertOk()
            ->assertJsonPath('data.detail.gps.status', 'clean');
    }

    public function test_the_gate_requires_the_new_signal_fields(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->post("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'latitude' => $task['destination']['latitude'],
            'longitude' => $task['destination']['longitude'],
            'recipient_name' => $task['recipient'],
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['accuracy', 'device_timestamp', 'fixes'], 'error.errors');
    }

    public function test_a_clean_fix_cannot_file_a_review_request(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/gps-lock", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'reason' => 'Mohon peninjauan perangkat saya.',
            ...$this->signals($latitude, $longitude),
        ])->assertStatus(422);

        $this->assertSame(0, GpsLockRequest::query()->count());
    }

    public function test_admin_approval_unlocks_the_gps_gate(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        $this->submitProof($task, ['accuracy' => 0])->assertStatus(422);

        $lockId = $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/gps-lock", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'reason' => 'Perangkat melaporkan akurasi 0 m, mohon peninjauan.',
            ...$this->signals($latitude, $longitude, ['accuracy' => 0]),
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $this->getJson("/api/v1/courier/tasks/{$task['tracking']}")
            ->assertOk()
            ->assertJsonPath('data.gpsLock.status', 'pending');

        $this->actingAs($this->admin());

        $this->getJson('/api/v1/admin/gps-locks?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.tracking', $task['tracking'])
            ->assertJsonPath('meta.has_more', false);

        $this->postJson("/api/v1/admin/gps-locks/{$lockId}/decision", [
            'decision' => 'approved',
            'note' => 'Perangkat kurir memang melaporkan akurasi 0 m.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'approve_gps_lock',
            'target_type' => 'gps_lock_request',
            'target_id' => $lockId,
        ]);

        // The retry carries the same fingerprint: the override lets the POD
        // through, but the capture stays flagged for review with the override
        // recorded as evidence.
        $this->actingAs($this->courier());
        $this->submitProof($task, ['accuracy' => 0])->assertCreated();

        $proof = DeliveryProof::query()->latest('captured_at')->firstOrFail();

        $this->assertSame('needs_review', $proof->review_status);
        $this->assertSame($lockId, $proof->gps_evidence['override_id']);

        $code = $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")->json('data.debug_code');
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => $code])->assertOk();

        $this->complete($task, ['accuracy' => 0])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');
    }

    public function test_admin_rejection_keeps_the_gate_closed(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        $this->submitProof($task, ['accuracy' => 0])->assertStatus(422);

        $lockId = $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/gps-lock", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'reason' => 'Perangkat melaporkan akurasi 0 m, mohon peninjauan.',
            ...$this->signals($latitude, $longitude, ['accuracy' => 0]),
        ])->assertCreated()->json('data.id');

        $this->actingAs($this->admin());
        $this->postJson("/api/v1/admin/gps-locks/{$lockId}/decision", [
            'decision' => 'rejected',
            'note' => 'Perangkat harus memakai GPS asli.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->actingAs($this->courier());

        // The same fingerprint is still blocked …
        $this->submitProof($task, ['accuracy' => 0])->assertStatus(422);

        // … while a genuine fix needs no admin action at all.
        $this->submitProof($task)->assertCreated();
    }

    public function test_couriers_cannot_decide_gps_locks(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->postJson("/api/v1/admin/gps-locks/{$task['tracking']}/decision", [
            'decision' => 'approved',
        ])->assertStatus(403);
    }
}
