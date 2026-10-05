<?php

namespace Tests\Feature\Api;

use App\Models\DeliveryProof;
use App\Models\User;
use App\Services\Verification\ProofWatermark;
use App\Support\Date;
use App\Support\Geo\Point;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * FRD-02: geotagged, watermarked proof of delivery on private (S3-capable)
 * storage with signed access and an admin invalidation path.
 */
class ProofDeliveryTest extends TestCase
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
     * Submits a camera capture from the courier's current GPS fix.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function submitProof(array $overrides = []): DeliveryProof
    {
        $task = $this->task();

        $this->post("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'latitude' => $task['destination']['latitude'],
            'longitude' => $task['destination']['longitude'],
            'recipient_name' => $task['recipient'],
            'relation' => 'langsung',
            'device_captured_at' => Date::now()->toIso8601String(),
            'photo' => UploadedFile::fake()->image('pod.jpg', 720, 960),
            ...$overrides,
        ])->assertCreated();

        return DeliveryProof::query()->latest('captured_at')->firstOrFail();
    }

    public function test_a_camera_photo_and_coordinates_are_mandatory(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $this->postJson("/api/v1/courier/tasks/{$task['tracking']}/proof", [
            'recipient_name' => $task['recipient'],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['latitude', 'longitude', 'photo'], 'error.errors');
    }

    public function test_capture_is_watermarked_and_stored_on_the_private_pod_disk(): void
    {
        $this->actingAs($this->courier());

        $proof = $this->submitProof();

        $this->assertSame('valid', $proof->review_status);
        $this->assertSame('langsung', $proof->relation);
        $this->assertStringStartsWith('pod/', $proof->photo_path);
        $this->assertLessThanOrEqual(1, $proof->distance_to_destination_m);
        Storage::disk('pod')->assertExists($proof->photo_path);

        $stored = (string) Storage::disk('pod')->get($proof->photo_path);
        $this->assertSame("\xFF\xD8", substr($stored, 0, 2), 'POD object must be a watermarked JPEG.');
        $this->assertGreaterThan(2000, strlen($stored));

        $shipment = $proof->shipment()->firstOrFail();
        $point = Point::parse($proof->point);
        $this->assertNotNull($point);

        $expectedHash = app(ProofWatermark::class)->hash(
            $shipment->tracking_number,
            $point['latitude'],
            $point['longitude'],
            (string) $proof->watermark_address,
            $proof->recipient_name,
            $proof->captured_at,
        );

        $this->assertSame($expectedHash, $proof->watermark_hash);
    }

    public function test_out_of_radius_capture_is_flagged_for_review(): void
    {
        $this->actingAs($this->courier());
        $task = $this->task();

        $proof = $this->submitProof([
            'latitude' => $task['destination']['latitude'] + 0.01,
        ]);

        $this->assertSame('needs_review', $proof->review_status);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $proof->shipment_id,
            'flag_type' => 'out_of_radius',
            'is_resolved' => false,
        ]);
    }

    public function test_device_clock_skew_is_flagged_for_review(): void
    {
        $this->actingAs($this->courier());

        $proof = $this->submitProof([
            'device_captured_at' => Date::now()->subMinutes(45)->toIso8601String(),
        ]);

        $this->assertSame('needs_review', $proof->review_status);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $proof->shipment_id,
            'flag_type' => 'device_time_mismatch',
            'is_resolved' => false,
        ]);
    }

    public function test_pod_photo_is_only_served_through_signed_admin_urls(): void
    {
        $this->actingAs($this->courier());
        $proof = $this->submitProof();

        $this->actingAs($this->admin());

        $this->getJson("/api/v1/admin/proofs/{$proof->id}/photo")->assertStatus(403);

        $signed = URL::temporarySignedRoute(
            'api.admin.proofs.photo',
            Date::now()->addMinutes(5),
            ['proof' => $proof->id],
        );

        $response = $this->get($signed)->assertOk();
        $this->assertStringContainsString('image/jpeg', (string) $response->headers->get('content-type'));

        $expired = URL::temporarySignedRoute(
            'api.admin.proofs.photo',
            Date::now()->subMinutes(1),
            ['proof' => $proof->id],
        );
        $this->get($expired)->assertStatus(403);

        $this->actingAs($this->courier());
        $this->get($signed)->assertStatus(403);
    }

    public function test_admin_can_invalidate_a_proof_with_a_reason(): void
    {
        $this->actingAs($this->courier());
        $proof = $this->submitProof();

        $admin = $this->admin();
        $this->actingAs($admin);

        $this->postJson("/api/v1/admin/proofs/{$proof->id}/review", ['decision' => 'invalid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('note', 'error.errors');

        $this->postJson("/api/v1/admin/proofs/{$proof->id}/review", [
            'decision' => 'invalid',
            'note' => 'Foto tidak memperlihatkan paket.',
        ])
            ->assertOk()
            ->assertJsonPath('data.review_status', 'invalid');

        $proof->refresh();
        $this->assertSame('invalid', $proof->review_status);
        $this->assertSame('Foto tidak memperlihatkan paket.', $proof->review_note);
        $this->assertSame($admin->admin?->id, $proof->reviewed_by);

        $this->assertDatabaseHas('admin_actions', [
            'admin_id' => $admin->admin?->id,
            'action_type' => 'review_pod',
            'target_type' => 'delivery_proof',
            'target_id' => $proof->id,
        ]);
        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $proof->shipment_id,
            'flag_type' => 'pod_invalid',
            'is_resolved' => false,
        ]);

        // Restoring the proof resolves the anomaly flag again.
        $this->postJson("/api/v1/admin/proofs/{$proof->id}/review", ['decision' => 'valid'])
            ->assertOk()
            ->assertJsonPath('data.review_status', 'valid');

        $this->assertDatabaseHas('anomaly_flags', [
            'shipment_id' => $proof->shipment_id,
            'flag_type' => 'pod_invalid',
            'is_resolved' => true,
        ]);
    }

    public function test_courier_cannot_review_a_proof(): void
    {
        $this->actingAs($this->courier());
        $proof = $this->submitProof();

        $this->postJson("/api/v1/admin/proofs/{$proof->id}/review", [
            'decision' => 'invalid',
            'note' => 'Percobaan dari akun kurir.',
        ])->assertStatus(403);
    }
}
