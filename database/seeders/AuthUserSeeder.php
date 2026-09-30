<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo login accounts for the prototype.
 *
 * Each account is wired to a seeded actor row so `Actor::courier()` /
 * `Actor::admin()` can resolve the PRD identity payload.
 */
class AuthUserSeeder extends Seeder
{
    public function run(): void
    {
        $courier = Courier::where('code', 'STR-001')->first();
        $admin = Admin::where('email', 'windy.kusuma@anteraja.example.com')->first();

        if ($courier) {
            User::updateOrCreate(
                ['email' => 'budi.pratama@anteraja.example.com'],
                [
                    'name' => $courier->name,
                    'password' => Hash::make('password'),
                    'role' => User::ROLE_COURIER,
                    'courier_id' => $courier->id,
                    'admin_id' => null,
                ],
            );
        }

        if ($admin) {
            User::updateOrCreate(
                ['email' => $admin->email],
                [
                    'name' => $admin->name,
                    'password' => Hash::make('password'),
                    'role' => User::ROLE_ADMIN,
                    'admin_id' => $admin->id,
                    'courier_id' => null,
                ],
            );
        }
    }
}
