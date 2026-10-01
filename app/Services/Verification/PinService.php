<?php

namespace App\Services\Verification;

use App\Models\Admin;
use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\GeofencePolicy;
use App\Models\PinChallenge;
use App\Models\PinDelivery;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use Illuminate\Support\Facades\Cache;

/**
 * PIN challenge lifecycle (FRD-03). PIN values are stored hashed.
 */
class PinService
{
    public function policyFor(Shipment $shipment): ?GeofencePolicy
    {
        return GeofencePolicy::where('service_type', $shipment->service_type)->first();
    }

    /**
     * Issue (or re-issue) a PIN challenge.
     *
     * @return array{challenge: PinChallenge, code: string}
     */
    public function issue(Shipment $shipment): array
    {
        $policy = $this->policyFor($shipment);
        $length = $policy->pin_length ?? 6;
        $ttl = $policy->pin_ttl_minutes ?? 15;
        $maxAttempts = $policy->pin_max_attempts ?? 3;

        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);

        $challenge = PinChallenge::updateOrCreate(
            ['shipment_id' => $shipment->id],
            [
                'recipient_id' => $shipment->recipient_id,
                'code_hash' => $this->hash($code),
                'attempts' => 0,
                'max_attempts' => $maxAttempts,
                'status' => 'pending',
                'expires_at' => Date::now()->addMinutes($ttl),
                'verified_at' => null,
                'locked_at' => null,
            ],
        );

        if ($shipment->recipient) {
            PinDelivery::create([
                'pin_challenge_id' => $challenge->id,
                'channel' => 'email',
                'destination' => $shipment->recipient->email ?? $shipment->recipient->phone,
                'attempt_no' => $challenge->resend_count + 1,
                'status' => 'sent',
            ]);
        }

        return ['challenge' => $challenge, 'code' => $code];
    }

    /**
     * @return array{status: string, attempts: int, max_attempts: int}
     */
    public function verify(Shipment $shipment, Courier $courier, string $code): array
    {
        $challenge = $shipment->pinChallenge;

        if (! $challenge) {
            abort(422, 'Belum ada tantangan PIN untuk pengiriman ini.');
        }

        $maxAttempts = (int) $challenge->max_attempts;

        if (in_array($challenge->status, ['locked', 'expired'], true)) {
            $this->record($shipment, $courier, ['result' => $challenge->status]);

            return [
                'status' => $challenge->status,
                'attempts' => (int) $challenge->attempts,
                'max_attempts' => $maxAttempts,
            ];
        }

        if ($challenge->expires_at !== null && $challenge->expires_at->isPast()) {
            $challenge->update(['status' => 'expired']);
            $this->record($shipment, $courier, ['result' => 'expired']);

            return ['status' => 'expired', 'attempts' => (int) $challenge->attempts, 'max_attempts' => $maxAttempts];
        }

        if (hash_equals($challenge->code_hash, $this->hash($code))) {
            $challenge->update(['status' => 'verified', 'verified_at' => Date::now()]);
            $this->record($shipment, $courier, ['result' => 'verified']);
            Cache::forget(DashboardService::CACHE_KEY);
            ShipmentCache::bump();

            return ['status' => 'verified', 'attempts' => (int) $challenge->attempts, 'max_attempts' => $maxAttempts];
        }

        $attempts = (int) $challenge->attempts + 1;
        $locked = $attempts >= $maxAttempts;

        $challenge->update([
            'attempts' => $attempts,
            'status' => $locked ? 'locked' : 'pending',
            'locked_at' => $locked ? Date::now() : null,
        ]);

        $this->record($shipment, $courier, array_filter([
            'result' => 'failed',
            'attempt' => $attempts,
            'locked' => $locked ?: null,
        ], static fn ($value) => $value !== null));

        if ($locked) {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $shipment->id, 'flag_type' => 'repeated_pin_failure'],
                [
                    'weight' => 2.00,
                    'details' => ['attempts' => $attempts],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );

            Cache::forget(DashboardService::CACHE_KEY);
            ShipmentCache::bump();
        }

        return [
            'status' => $locked ? 'locked' : 'pending',
            'attempts' => $attempts,
            'max_attempts' => $maxAttempts,
        ];
    }

    public function override(Shipment $shipment, Admin $admin, string $reason): PinChallenge
    {
        $challenge = $shipment->pinChallenge()->firstOrFail();

        $challenge->update([
            'status' => 'override',
            'override_by' => $admin->id,
            'override_reason' => $reason,
            'override_at' => Date::now(),
        ]);

        return $challenge;
    }

    private function hash(string $code): string
    {
        return hash('sha256', 'pin:'.$code);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function record(Shipment $shipment, ?Courier $courier, array $metadata): void
    {
        DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier?->id,
            'event_type' => 'pin_verification',
            'actor_type' => 'courier',
            'metadata' => $metadata,
        ]);
    }
}
