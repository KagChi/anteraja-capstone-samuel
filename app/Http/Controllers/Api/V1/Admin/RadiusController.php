<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\Concerns\RespondsWithEnvelope;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Admin\UpdateRadiusRequest;
use App\Services\Radius\RadiusService;
use App\Support\Auth;
use Illuminate\Http\JsonResponse;

class RadiusController extends Controller
{
    use RespondsWithEnvelope;

    public function index(RadiusService $radius): JsonResponse
    {
        return $this->ok($radius->segments(), 200, $radius->meta());
    }

    public function update(UpdateRadiusRequest $request, RadiusService $radius): JsonResponse
    {
        $admin = Auth::adminModel();

        if (! $admin) {
            abort(403, 'Hanya admin yang dapat mengubah radius.');
        }

        $radius->update(
            (string) $request->input('service_type'),
            (int) $request->input('radius_m'),
            $admin,
        );

        return $this->ok($radius->segments(), 200, ['meta' => $radius->meta()]);
    }
}
