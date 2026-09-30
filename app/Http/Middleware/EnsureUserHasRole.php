<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return $request->expectsJson()
                ? response()->json([
                    'success' => false,
                    'data' => null,
                    'error' => ['code' => 'UNAUTHENTICATED', 'message' => 'Sesi tidak ditemukan.'],
                ], 401)
                : redirect()->route('login');
        }

        if ($roles !== [] && ! in_array($user->role, $roles, true)) {
            abort(403, 'Peran pengguna tidak diizinkan mengakses sumber daya ini.');
        }

        return $next($request);
    }
}
