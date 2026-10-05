<?php

namespace Tests\Feature\Api;

use App\Models\DeliveryProof;
use App\Models\MeetingPoint;
use App\Models\Shipment;
use App\Models\User;
use App\Support\Date;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * FRD-04: the courier proposes a handover point (with the buyer's reported
 * position), the admin approves, overrides or rejects it, and an approved
 * point becomes the centre of the completion geofence (FR-04-07).
 */
class MeetingPointTest extends TestCase
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

    /**
     * @param  array<string, mixed>  $task
     * @param  array<string, mixed>  $payload
     */
    private function propose(array $task, array $payload): string
    {
        return $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/meeting-point", $payload)
            ->assertCreated()
            ->json('data.id');
    }

    private function shipment(array $task): Shipment
    {
        return Shipment::where('tracking_number', $task['tracking'])->firstOrFail();
    }

    public function test_the_courier_proposal_records_both_points_and_distances(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $meetingLatitude = $latitude + 0.007;

        $response = $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/meeting-point", [
            'latitude' => $meetingLatitude,
            'longitude' => $longitude,
            'buyer_latitude' => $latitude + 0.001,
            'buyer_longitude' => $longitude,
        ])->assertCreated();

        $id = $response->json('data.id');
        $meeting = MeetingPoint::findOrFail($id);

        $this->assertSame('proposed', $meeting->status);
        $this->assertGreaterThan(700, $meeting->distance_from_destination_m);
        $this->assertGreaterThan(50, $meeting->distance_from_buyer_m);
        $this->assertTrue($meeting->expires_at->isFuture());

        $this->assertDatabaseHas('delivery_events', [
            'shipment_id' => $meeting->shipment_id,
            'event_type' => 'meeting_point_proposed',
            'actor_type' => 'courier',
        ]);

        $this->getJson("/api/v1/courier/tasks/{$task['tracking']}")
            ->assertOk()
            ->assertJsonPath('data.meetingPoint.status', 'proposed')
            ->assertJsonPath('data.meetingPoint.needsMeetingPoint', true);
    }

    public function test_a_pending_proposal_blocks_a_second_one_until_it_expires(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $payload = ['latitude' => $latitude + 0.007, 'longitude' => $longitude];

        $id = $this->propose($task, $payload);

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/meeting-point", $payload)
            ->assertStatus(422);

        // FR-04-08: once the window passes the proposal expires on the next
        // read and the courier may propose again.
        MeetingPoint::findOrFail($id)->forceFill(['expires_at' => Date::now()->subMinute()->utc()])->save();

        $replacement = $this->propose($task, ['latitude' => $latitude + 0.008, 'longitude' => $longitude]);

        $this->assertNotSame($id, $replacement);
        $this->assertSame('expired', MeetingPoint::findOrFail($id)->status);
        $this->assertDatabaseHas('delivery_events', ['event_type' => 'meeting_point_expired']);
    }

    public function test_an_approved_meeting_point_moves_the_completion_geofence(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $meetingLatitude = $latitude + 0.007;

        $id = $this->propose($task, ['latitude' => $meetingLatitude, 'longitude' => $longitude]);

        $this->actingAs($this->admin());

        $this->getJson('/api/v1/admin/meeting-points')
            ->assertOk()
            ->assertJsonPath('data.0.tracking', $task['tracking'])
            ->assertJsonPath('data.0.status', 'proposed');

        $this->postJson("/api/v1/admin/meeting-points/{$id}/decision", [
            'decision' => 'approved',
            'note' => 'Penerima menunggu di gerbang samping.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $shipment = $this->shipment($task);

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'approve_meeting_point',
            'target_type' => 'meeting_point',
            'target_id' => $id,
        ]);
        $this->assertDatabaseHas('delivery_events', [
            'shipment_id' => $shipment->id,
            'event_type' => 'meeting_point_approved',
            'actor_type' => 'admin',
        ]);

        $geofence = DB::selectOne(
            'SELECT source, radius_m, round(ST_Distance(center, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography)) AS d
             FROM geofences WHERE shipment_id = ? AND is_active LIMIT 1',
            [$longitude, $meetingLatitude, $shipment->id],
        );

        $this->assertSame('meeting_point', $geofence->source);
        $this->assertSame(0, (int) $geofence->d);

        // The courier completes at the meeting point: far from the master
        // destination, but inside the (moved) geofence, so no out-of-radius
        // flag is raised.
        $this->actingAs($this->courier());
        $code = $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin")->json('data.debug_code');
        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/pin/verify", ['code' => $code])->assertOk();

        $this->post("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'latitude' => $meetingLatitude,
            'longitude' => $longitude,
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => Date::now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 480, 640),
            ...$this->gpsSignals($meetingLatitude, $longitude),
        ])->assertCreated();

        $proof = DeliveryProof::query()->latest('captured_at')->firstOrFail();

        $this->assertSame('valid', $proof->review_status);
        $this->assertGreaterThan(700, $proof->distance_to_destination_m);
        $this->assertDatabaseMissing('anomaly_flags', [
            'shipment_id' => $shipment->id,
            'flag_type' => 'out_of_radius',
        ]);

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/complete", [
            'latitude' => $meetingLatitude,
            'longitude' => $longitude,
            ...$this->gpsSignals($meetingLatitude, $longitude),
        ])->assertOk()->assertJsonPath('data.status', 'delivered');
    }

    public function test_an_admin_can_set_a_different_point_unilaterally(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $id = $this->propose($task, ['latitude' => $latitude + 0.007, 'longitude' => $longitude]);

        $this->actingAs($this->admin());
        $this->postJson("/api/v1/admin/meeting-points/{$id}/decision", [
            'decision' => 'approved',
            'note' => 'Titik usulan terlalu jauh dari gerbang utama.',
            'latitude' => $latitude + 0.003,
            'longitude' => $longitude,
        ])->assertOk()->assertJsonPath('data.status', 'admin_set');

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'set_meeting_point',
            'target_id' => $id,
        ]);

        $geofence = DB::selectOne(
            'SELECT round(ST_Distance(center, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography)) AS d
             FROM geofences WHERE shipment_id = ? AND is_active LIMIT 1',
            [$longitude, $latitude + 0.003, $this->shipment($task)->id],
        );

        $this->assertSame(0, (int) $geofence->d);
    }

    public function test_a_rejected_proposal_requires_a_reason_and_can_be_replaced(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $latitude = $task['destination']['latitude'];
        $longitude = $task['destination']['longitude'];
        $id = $this->propose($task, ['latitude' => $latitude + 0.007, 'longitude' => $longitude]);

        $this->actingAs($this->admin());
        $this->postJson("/api/v1/admin/meeting-points/{$id}/decision", ['decision' => 'rejected'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('note', 'error.errors');

        $this->postJson("/api/v1/admin/meeting-points/{$id}/decision", [
            'decision' => 'rejected',
            'note' => 'Titik usulan berada di area terlarang.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'reject_meeting_point',
            'target_id' => $id,
        ]);

        $this->actingAs($this->courier());
        $this->propose($task, ['latitude' => $latitude + 0.006, 'longitude' => $longitude]);
    }

    public function test_the_proposal_requires_valid_coordinates(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/meeting-point", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude'], 'error.errors');
    }

    public function test_couriers_cannot_access_the_matchmaking_queue(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();
        $id = $this->propose($task, [
            'latitude' => $task['destination']['latitude'] + 0.007,
            'longitude' => $task['destination']['longitude'],
        ]);

        $this->getJson('/api/v1/admin/meeting-points')->assertStatus(403);
        $this->postJson("/api/v1/admin/meeting-points/{$id}/decision", [
            'decision' => 'approved',
        ])->assertStatus(403);
    }
}
