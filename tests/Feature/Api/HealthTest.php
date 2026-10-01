<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_an_envelope(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'ok');
    }

    public function test_health_endpoint_reports_redis_as_not_configured(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.checks.redis.status', 'not_configured');
    }

    public function test_up_readiness_endpoint_pings_dependencies(): void
    {
        $this->get('/up')->assertOk();
    }
}
