<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FR-05-08/09: the audit trail exports as CSV and the access is recorded.
 */
class AuditExportTest extends TestCase
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

    private function courier(): User
    {
        return User::where('role', User::ROLE_COURIER)->firstOrFail();
    }

    public function test_an_admin_exports_the_audit_trail_as_csv(): void
    {
        $this->actingAs($this->admin());
        $tracking = $this->getJson('/api/v1/shipments')->json('data.0.tracking');

        $response = $this->get("/api/v1/admin/shipments/{$tracking}/audit-export")->assertOk();

        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $this->assertStringContainsString('attachment', (string) $response->headers->get('content-disposition'));

        $body = $response->streamedContent();

        $this->assertStringContainsString('bagian,waktu,aktor,jenis,detail,latitude,longitude,jarak_m', $body);
        $this->assertStringContainsString($tracking, $body);
        $this->assertStringContainsString('ringkasan', $body);

        $this->assertDatabaseHas('audit_access_logs', [
            'action' => 'export',
            'actor_type' => 'admin',
        ]);
    }

    public function test_couriers_cannot_export_the_audit_trail(): void
    {
        $this->actingAs($this->courier());

        $this->getJson('/api/v1/admin/shipments/AJ2509000011/audit-export')->assertStatus(403);
    }
}
