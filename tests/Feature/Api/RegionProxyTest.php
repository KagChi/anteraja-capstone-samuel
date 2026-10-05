<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The console/courier apps read region data from our API instead of the
 * third-party hosts, so browser CORS never applies and answers are cached.
 */
class RegionProxyTest extends TestCase
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

    public function test_guests_cannot_reach_the_region_proxy(): void
    {
        $this->getJson('/api/v1/regions/provinces')->assertStatus(401);
    }

    public function test_provinces_are_proxied_and_cached(): void
    {
        Http::fake([
            '*provinces.json' => Http::response([
                ['id' => '31', 'name' => 'DKI JAKARTA'],
            ]),
        ]);

        $this->actingAs($this->courier());

        $this->getJson('/api/v1/regions/provinces')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'DKI JAKARTA');

        $this->getJson('/api/v1/regions/provinces')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_regencies_validate_the_province_id_and_are_proxied(): void
    {
        Http::fake([
            '*regencies/31.json' => Http::response([
                ['id' => '3171', 'province_id' => '31', 'name' => 'KOTA ADM. JAKARTA SELATAN'],
            ]),
        ]);

        $this->actingAs($this->courier());

        $this->getJson('/api/v1/regions/regencies/abc')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->getJson('/api/v1/regions/regencies/31')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'KOTA ADM. JAKARTA SELATAN');
    }

    public function test_postal_search_requires_a_minimum_query_length(): void
    {
        $this->actingAs($this->courier());

        $this->getJson('/api/v1/postal/search?q=ke')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_postal_search_proxies_the_upstream_payload(): void
    {
        Http::fake([
            'kodepos.vercel.app/*' => Http::response([
                'statusCode' => 200,
                'code' => '200',
                'data' => [[
                    'code' => 12190,
                    'village' => 'SENAYAN',
                    'district' => 'KEBAYORAN BARU',
                    'regency' => 'KOTA ADM. JAKARTA SELATAN',
                    'province' => 'DKI JAKARTA',
                    'latitude' => -6.23,
                    'longitude' => 106.8,
                    'elevation' => 10,
                    'timezone' => 'Asia/Jakarta',
                ]],
            ]),
        ]);

        $this->actingAs($this->courier());

        $this->getJson('/api/v1/postal/search?q=senayan')
            ->assertOk()
            ->assertJsonPath('data.0.code', 12190)
            ->assertJsonPath('data.0.district', 'KEBAYORAN BARU');
    }

    public function test_upstream_failures_return_a_clean_envelope(): void
    {
        Http::fake([
            '*' => Http::response('upstream down', 503),
        ]);

        $this->actingAs($this->courier());

        $this->getJson('/api/v1/regions/provinces')
            ->assertStatus(502)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error.code', 'UPSTREAM_UNAVAILABLE');
    }
}
