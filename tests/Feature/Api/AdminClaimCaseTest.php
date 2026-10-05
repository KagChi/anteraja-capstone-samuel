<?php

namespace Tests\Feature\Api;

use App\Models\Shipment;
use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FRD-05 — closing a claim case from the admin audit trail.
 */
class AdminClaimCaseTest extends TestCase
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

    public function test_closing_a_case_creates_and_closes_it_for_a_shipment_without_an_exception(): void
    {
        $shipment = Shipment::where('tracking_number', 'AJ2509000013')->firstOrFail();
        $this->assertSame(0, $shipment->claimCases()->count());

        $this->actingAs($this->admin())
            ->postJson("/api/v1/admin/shipments/{$shipment->id}/close-case", [
                'decision' => 'approved',
                'note' => 'Penerima tidak di lokasi; pengiriman dijadwalkan ulang.',
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'closed');

        $case = $shipment->claimCases()->firstOrFail();
        $this->assertSame('closed', $case->status);
        $this->assertNotNull($case->closed_at);
        $this->assertSame($this->admin()->admin->id, $case->closed_by);

        $this->assertDatabaseHas('admin_actions', [
            'action_type' => 'close_claim',
            'target_type' => 'claim_case',
            'target_id' => $case->id,
        ]);
        $this->assertDatabaseHas('audit_access_logs', [
            'shipment_id' => $shipment->id,
            'action' => 'close_case',
        ]);
    }

    public function test_rejecting_requires_a_note_and_marks_the_case_for_investigation(): void
    {
        $shipment = Shipment::where('tracking_number', 'AJ2509000013')->firstOrFail();

        $this->actingAs($this->admin())
            ->postJson("/api/v1/admin/shipments/{$shipment->id}/close-case", ['decision' => 'rejected'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['error' => ['errors' => ['note']]]);

        $this->actingAs($this->admin())
            ->postJson("/api/v1/admin/shipments/{$shipment->id}/close-case", [
                'decision' => 'rejected',
                'note' => 'Perlu investigasi lebih lanjut.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'investigating');

        $this->assertDatabaseHas('claim_findings', [
            'finding' => 'Perlu investigasi lebih lanjut.',
        ]);
    }

    public function test_closing_resolves_open_anomaly_flags(): void
    {
        $shipment = Shipment::where('tracking_number', 'AJ2509000010')->firstOrFail();
        $this->assertGreaterThan(0, $shipment->anomalyFlags()->where('is_resolved', false)->count());

        $this->actingAs($this->admin())
            ->postJson("/api/v1/admin/shipments/{$shipment->id}/close-case", [
                'decision' => 'approved',
                'note' => 'Terverifikasi.',
            ])
            ->assertOk();

        $this->assertSame(0, $shipment->anomalyFlags()->where('is_resolved', false)->count());
    }

    public function test_exception_decision_resolves_by_shipment_id(): void
    {
        $shipment = Shipment::where('tracking_number', 'AJ2509000005')->firstOrFail();

        $this->actingAs($this->admin())
            ->postJson("/api/v1/admin/exceptions/{$shipment->id}/decision", [
                'decision' => 'approved',
                'note' => 'Disetujui.',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_shipment_detail_exposes_the_closed_case_and_pin_status(): void
    {
        $this->actingAs($this->admin());

        $shipment = Shipment::where('tracking_number', 'AJ2509000013')->firstOrFail();

        $this->postJson("/api/v1/admin/shipments/{$shipment->id}/close-case", [
            'decision' => 'approved',
            'note' => 'Deviasi wajar di lobi.',
        ])->assertOk();

        $this->getJson("/api/v1/shipments/{$shipment->id}")
            ->assertOk()
            ->assertJsonPath('data.detail.case.closed', true)
            ->assertJsonPath('data.detail.case.investigating', false)
            ->assertJsonPath('data.detail.case.resolution', 'Deviasi wajar di lobi.');

        // The PIN chip reflects the actual challenge state.
        $pending = Shipment::where('tracking_number', 'AJ2509000011')->firstOrFail();

        $this->getJson("/api/v1/shipments/{$pending->id}")
            ->assertOk()
            ->assertJsonPath('data.detail.pod.pinStatus', 'pending');
    }
}
