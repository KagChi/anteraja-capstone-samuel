<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeliveryProof;
use App\Support\Date;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves a private POD object through a short-lived signed route (FR-02-06).
 * On S3 the request is answered with a presigned object URL; the local
 * fallback streams the object from the private storage path.
 */
class ProofPhotoController extends Controller
{
    public function __invoke(DeliveryProof $proof): BinaryFileResponse|RedirectResponse
    {
        $disk = Storage::disk('pod');

        abort_if(! $proof->photo_path || ! $disk->exists($proof->photo_path), 404, 'Foto POD tidak ditemukan.');

        if (config('filesystems.disks.pod.driver') === 's3') {
            return redirect()->away($disk->temporaryUrl($proof->photo_path, Date::now()->addMinutes(5)));
        }

        return response()->file($disk->path($proof->photo_path), [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=60',
        ]);
    }
}
