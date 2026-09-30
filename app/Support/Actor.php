<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * Resolves the acting courier / admin for the current request.
 *
 * Mirrors the PRD §5 contract so both the web layer and the `/api/v1`
 * controllers read the same identity shape.
 */
class Actor
{
    public static function user(?Request $request = null): ?User
    {
        return ($request ?? request())->user();
    }

    /**
     * @return array{id: string, name: string, code: string, phone: string|null, serviceAreaId: string|null}|null
     */
    public static function courier(?Request $request = null): ?array
    {
        $user = self::user($request);

        if (! $user?->isCourier()) {
            return null;
        }

        $courier = $user->courier;

        if (! $courier) {
            return null;
        }

        return [
            'id' => $courier->id,
            'name' => $user->name,
            'code' => $courier->code,
            'phone' => $courier->phone,
            'serviceAreaId' => $courier->service_area_id,
        ];
    }

    /**
     * @return array{id: string, name: string, role: string, serviceAreaId: string|null}|null
     */
    public static function admin(?Request $request = null): ?array
    {
        $user = self::user($request);

        if (! $user?->isAdmin()) {
            return null;
        }

        $admin = $user->admin;

        if (! $admin) {
            return null;
        }

        return [
            'id' => $admin->id,
            'name' => $user->name,
            'role' => $admin->role,
            'serviceAreaId' => $admin->service_area_id,
        ];
    }
}
