<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AnterajaSeeder;
use Database\Seeders\AuthUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AnterajaSeeder::class);
        $this->seed(AuthUserSeeder::class);
    }

    public function test_courier_can_sign_in_and_lands_on_tasks(): void
    {
        $this->post('/login', [
            'email' => 'budi.pratama@anteraja.example.com',
            'password' => 'password',
        ])->assertRedirect('/courier/tugas');

        $this->assertAuthenticated();
        $this->assertSame(User::ROLE_COURIER, auth()->user()->role);
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $this->post('/login', [
            'email' => 'budi.pratama@anteraja.example.com',
            'password' => 'wrong-password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_courier_cannot_open_admin_pages(): void
    {
        $courier = User::where('role', User::ROLE_COURIER)->firstOrFail();

        $this->actingAs($courier)->get('/admin/dashboard')->assertForbidden();
    }
}
