<?php

namespace App\Support;

use App\Models\Admin;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Resolves the acting courier / admin for the current request (PRD §5).
 */
class Auth
{
    public static function user(?Request $request = null): ?User
    {
        return ($request ?? request())->user();
    }

    public static function courierModel(?Request $request = null): ?Courier
    {
        $user = self::user($request);

        return $user?->isCourier() ? $user->courier : null;
    }

    public static function adminModel(?Request $request = null): ?Admin
    {
        $user = self::user($request);

        return $user?->isAdmin() ? $user->admin : null;
    }

    /**
     * The acting courier's id straight off the authenticated users row. Read
     * paths that only need the id (the task list, ownership checks) use this so
     * they do not spend a second query loading the whole courier.
     */
    public static function courierId(?Request $request = null): ?string
    {
        $user = self::user($request);

        return $user?->isCourier() ? $user->courier_id : null;
    }

    /**
     * @return array{id: string, name: string, code: string, serviceAreaId: string|null, phone: string|null}|null
     */
    public static function getCurrentCourier(?Request $request = null): ?array
    {
        $user = self::user($request);
        $courier = self::courierModel($request);

        if (! $user || ! $courier) {
            return null;
        }

        return [
            'id' => $courier->id,
            'name' => $user->name,
            'code' => $courier->code,
            'serviceAreaId' => $courier->service_area_id,
            'phone' => $courier->phone,
        ];
    }

    /**
     * @return array{id: string, name: string, role: string, serviceAreaId: string|null}|null
     */
    public static function getCurrentAdmin(?Request $request = null): ?array
    {
        $user = self::user($request);
        $admin = self::adminModel($request);

        if (! $user || ! $admin) {
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
