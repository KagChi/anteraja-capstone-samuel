<?php

namespace Tests\Feature\Api;

use App\Models\PinChallenge;
use App\Models\Shipment;
use App\Models\User;
use App\Support\Date;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * FR-03-06/08: three wrong attempts lock the PIN, the lock survives a PIN
 * re-issue, and the admin PIN dashboard can clear or override it with a
 * recorded reason.
 */
class PinLockTest extends TestCase
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
     * Issues the PIN and exhausts the three attempts with a wrong code.
     *
     * @param  array<string, mixed>  $task
     */
    private function lockPin(array $task): PinChallenge
    {
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")->assertCreated();

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => '000000'])
                ->assertOk();
        }

        $challenge = PinChallenge::query()
            ->whereHas('shipment', fn ($query) => $query->where('tracking_number', $task['tracking']))
            ->firstOrFail();

        $this->assertSame('locked', $challenge->status);

        return $challenge;
    }

    /**
     * @return array<string, mixed>
     */
    private function gpsSignals(float $latitude, float $longitude): array
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
        ];
    }

    public function test_three_wrong_attempts_lock_the_challenge(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $challenge = $this->lockPin($task);

        $this->assertSame(3, $challenge->attempts);
        $this->assertNotNull($challenge->locked_at);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $challenge->shipment_id,
            'flag_type' => 'repeated_pin_failure',
            'weight' => 2.00,
            'is_resolved' => false,
        ]);

        // Further attempts stay rejected while the lock is in place.
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => '123456'])
            ->assertOk()
            ->assertJsonPath('data.status', 'locked')
            ->assertJsonPath('data.verified', false);
    }

    public function test_reissuing_the_pin_never_clears_a_lock(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);

        // The courier app re-issues the PIN on every page load; that must not
        // hand the courier a fresh set of attempts.
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")
            ->assertCreated()
            ->assertJsonPath('data.status', 'locked')
            ->assertJsonPath('data.attempts', 3);

        $challenge->refresh();

        $this->assertSame('locked', $challenge->status);
        $this->assertSame(3, $challenge->attempts);
    }

    public function test_reissuing_the_pin_keeps_the_attempt_counter(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")->assertCreated();
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => '000000'])
            ->assertOk()
            ->assertJsonPath('data.attempts', 1);

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.attempts', 1);
    }

    public function test_the_admin_dashboard_lists_locked_challenges(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);

        $this->actingAs($this->admin());

        $this->getJson('/api/v1/admin/pin-locks')
            ->assertOk()
            ->assertJsonPath('data.0.tracking', $task['tracking'])
            ->assertJsonPath('data.0.status', 'locked')
            ->assertJsonPath('data.0.attempts', 3)
            ->assertJsonPath('data.0.maxAttempts', (int) $challenge->max_attempts)
            ->assertJsonPath('meta.has_more', false);

        // The status filter scopes the queue: the freshly locked shipment is
        // not part of the expired bucket seeded with historical challenges.
        $expired = $this->getJson('/api/v1/admin/pin-locks?status=expired')
            ->assertOk()
            ->json('data');

        $this->assertNotContains($task['tracking'], array_column($expired, 'tracking'));
    }

    public function test_admin_unlock_resets_the_challenge_and_resolves_the_flag(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);

        $this->actingAs($this->admin());

        $this->postJson("/api/v1/admin/pin-locks/{$challenge->id}/decision", [
            'decision' => 'unlock',
            'note' => 'Penerima mengonfirmasi PIN lewat telepon.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.attempts', 0);

        $challenge->refresh();

        $this->assertSame('pending', $challenge->status);
        $this->assertSame(0, $challenge->attempts);
        $this->assertNull($challenge->locked_at);
        $this->assertTrue($challenge->expires_at->isFuture());

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'unlock_pin',
            'target_type' => 'pin_challenge',
            'target_id' => $challenge->id,
        ]);
        $this->assertDatabaseHas('delivery_events', [
            'shipment_id' => $challenge->shipment_id,
            'event_type' => 'pin_verification',
            'actor_type' => 'admin',
        ]);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $challenge->shipment_id,
            'flag_type' => 'repeated_pin_failure',
            'is_resolved' => true,
        ]);

        // The courier can now verify the real PIN and is unblocked.
        $this->actingAs($this->courier());
        $this->getJson("/api/v1/courier/tasks/{$task['tracking']}")
            ->assertOk()
            ->assertJsonPath('data.pin.status', 'pending')
            ->assertJsonPath('data.pin.locked', false);
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => '123456'])
            ->assertOk()
            ->assertJsonPath('data.verified', true)
            ->assertJsonPath('data.status', 'verified');
    }

    public function test_admin_override_lets_the_courier_complete_without_the_pin(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);
        $shipment = Shipment::where('tracking_number', $task['tracking'])->firstOrFail();

        $this->assertTrue((bool) $shipment->pin_required, 'The demo task must require a PIN.');

        $this->actingAs($this->admin());
        $this->postJson("/api/v1/admin/pin-locks/{$challenge->id}/decision", [
            'decision' => 'override',
            'note' => 'Penerima tidak dapat menerima panggilan; identitas diverifikasi manual.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'override');

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'override_pin',
            'target_type' => 'pin_challenge',
            'target_id' => $challenge->id,
        ]);

        $this->actingAs($this->courier());
        $this->getJson("/api/v1/courier/tasks/{$task['tracking']}")
            ->assertOk()
            ->assertJsonPath('data.pin.override', true)
            ->assertJsonPath('data.pin.verified', true);

        // Without the override this completion would be refused; here the
        // courier only needs the geofence and the POD.
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];

        $this->post("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => Date::now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
            ...$this->gpsSignals($latitude, $longitude),
        ])->assertCreated();

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/complete", [
            'latitude' => $latitude,
            'longitude' => $longitude,
            ...$this->gpsSignals($latitude, $longitude),
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'delivered');
    }

    public function test_couriers_cannot_access_the_pin_dashboard(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);

        $this->getJson('/api/v1/admin/pin-locks')->assertStatus(403);
        $this->postJson("/api/v1/admin/pin-locks/{$challenge->id}/decision", [
            'decision' => 'unlock',
            'note' => 'Coba buka sendiri.',
        ])->assertStatus(403);
    }

    public function test_the_decision_requires_a_valid_action_and_reason(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $challenge = $this->lockPin($task);

        $this->actingAs($this->admin());

        $this->postJson("/api/v1/admin/pin-locks/{$challenge->id}/decision", [
            'decision' => 'approve',
            'note' => 'Alasan yang cukup panjang.',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('decision', 'error.errors');

        $this->postJson("/api/v1/admin/pin-locks/{$challenge->id}/decision", [
            'decision' => 'unlock',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('note', 'error.errors');
    }

    public function test_explicit_resends_are_capped_but_page_loads_are_not(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $tracking = $task['tracking'];

        // The app re-issues the PIN on every page load; that never consumes
        // the FR-03-04 resend budget.
        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->postJson("/api/v1/courier/tasks/{$tracking}/pin")->assertCreated();
        }

        for ($resend = 0; $resend < 3; $resend++) {
            $this->postJson("/api/v1/courier/tasks/{$tracking}/pin", ['resend' => true])
                ->assertCreated()
                ->assertJsonPath('data.resend_count', $resend + 1)
                ->assertJsonPath('data.can_resend', $resend < 2);
        }

        $this->postJson("/api/v1/courier/tasks/{$tracking}/pin", ['resend' => true])
            ->assertStatus(422);

        $this->assertDatabaseHas('pin_challenges', [
            'shipment_id' => Shipment::where('tracking_number', $tracking)->value('id'),
            'resend_count' => 3,
        ]);

        // The courier sees the exhausted budget on the task payload.
        $this->getJson("/api/v1/courier/tasks/{$tracking}")
            ->assertOk()
            ->assertJsonPath('data.pin.resendCount', 3)
            ->assertJsonPath('data.pin.resendLimit', 3);
    }
}
