<?php

namespace App\Support;

use App\Models\DeliveryProof;
use Illuminate\Support\Facades\URL;

/**
 * FR-02-06: POD objects live on a private disk and are only reachable through
 * short-lived signed URLs, and only for admins.
 */
class ProofMedia
{
    public const URL_TTL_MINUTES = 15;

    public static function signedUrl(?DeliveryProof $proof): ?string
    {
        if (! $proof || ! $proof->photo_path || ! Auth::adminModel()) {
            return null;
        }

        return URL::temporarySignedRoute(
            'api.admin.proofs.photo',
            Date::now()->addMinutes(self::URL_TTL_MINUTES),
            ['proof' => $proof->id],
        );
    }
}
