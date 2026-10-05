<?php

namespace App\Services\Verification;

use App\Models\Admin;
use App\Models\AdminAction;
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
    /**
     * Demo prototype: the recipient PIN is a fixed code so the flow can be
     * demonstrated without SMS/email delivery.
     */
    private const DEMO_PIN = '123456';

    public function policyFor(Shipment $shipment): ?GeofencePolicy
    {
        return GeofencePolicy::where('service_type', $shipment->service_type)->first();
    }

    /**
     * FR-03-04: how many explicit resends the segment policy allows.
     */
    public static function resendLimit(Shipment $shipment): int
    {
        return (int) (GeofencePolicy::query()
            ->where('service_type', $shipment->service_type)
            ->value('pin_max_resends') ?? 3);
    }

    /**
     * Issue (or re-issue) a PIN challenge.
     *
     * A lock is only cleared by an admin decision (FR-03-08): re-issuing the
     * PIN - which the courier app does on every page load - must never reset
     * the attempt counter, otherwise reloading would silently bypass the
     * lock that the failed attempts were supposed to enforce.
     *
     * @return array{challenge: PinChallenge, code: string}
     */
    public function issue(Shipment $shipment, bool $resend = false): array
    {
        $policy = $this->policyFor($shipment);
        $length = $policy->pin_length ?? 6;
        $ttl = $policy->pin_ttl_minutes ?? 15;
        $maxAttempts = $policy->pin_max_attempts ?? 3;
        $maxResends = self::resendLimit($shipment);

        $code = str_pad(substr(self::DEMO_PIN, 0, $length), $length, '0', STR_PAD_LEFT);

        $challenge = PinChallenge::where('shipment_id', $shipment->id)->first();

        if ($challenge !== null && in_array($challenge->status, ['locked', 'verified', 'override'], true)) {
            return ['challenge' => $challenge, 'code' => $code];
        }

        // FR-03-04: the explicit resend is capped; the app's page-load refresh
        // is not counted but also never clears a lock or the attempts.
        if ($resend && $challenge !== null && $challenge->resend_count >= $maxResends) {
            abort(422, 'Batas kirim ulang PIN tercapai. Minta Admin membuka blokir PIN dari dashboard.');
        }

        if ($challenge === null) {
            $challenge = PinChallenge::create([
                'shipment_id' => $shipment->id,
                'recipient_id' => $shipment->recipient_id,
                'code_hash' => $this->hash($code),
                'attempts' => 0,
                'max_attempts' => $maxAttempts,
                'status' => 'pending',
                'expires_at' => Date::now()->addMinutes($ttl)->utc(),
            ]);
        } else {
            $challenge->update([
                'max_attempts' => $maxAttempts,
                'status' => 'pending',
                'expires_at' => Date::now()->addMinutes($ttl)->utc(),
                'locked_at' => null,
                ...($resend ? ['resend_count' => (int) $challenge->resend_count + 1] : []),
            ]);
        }

        if ($shipment->recipient) {
            PinDelivery::create([
                'pin_challenge_id' => $challenge->id,
                'channel' => 'email',
                'destination' => $shipment->recipient->email ?? $shipment->recipient->phone,
                'attempt_no' => $challenge->resend_count + 1,
                'status' => 'sent',
            ]);
        }

        // A re-issue changes the visible PIN state (expiry, resend count), so
        // the cached task/list payloads are invalidated.
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return ['challenge' => $challenge, 'code' => $code];
    }

    /**
     * FR-03-08: an admin/CS clears the lock (the courier gets a fresh set of
     * attempts) or overrides the PIN entirely. Both decisions carry a reason,
     * are written to the audit trail and resolve the repeated-failure flag.
     *
     * @param  'unlock'|'override'  $decision
     */
    public function decide(PinChallenge $challenge, Admin $admin, string $decision, string $reason): PinChallenge
    {
        if ($decision === 'unlock') {
            $policy = $this->policyFor($challenge->shipment);
            $ttl = $policy->pin_ttl_minutes ?? 15;

            $challenge->update([
                'status' => 'pending',
                'attempts' => 0,
                'locked_at' => null,
                'expires_at' => Date::now()->addMinutes($ttl)->utc(),
                'override_by' => null,
                'override_reason' => null,
                'override_at' => null,
            ]);
        } else {
            $challenge->update([
                'status' => 'override',
                'override_by' => $admin->id,
                'override_reason' => $reason,
                'override_at' => Date::now(),
            ]);
        }

        $shipment = $challenge->shipment;

        $this->record($shipment, $shipment->courier, [
            'result' => $decision === 'unlock' ? 'unlocked' : 'override',
            'by' => $admin->id,
            'reason' => $reason,
        ], 'admin');

        // The admin reviewed the incident; a further lock re-raises the flag.
        AnomalyFlag::query()
            ->where('shipment_id', $challenge->shipment_id)
            ->where('flag_type', 'repeated_pin_failure')
            ->update(['is_resolved' => true]);

        AdminAction::create([
            'admin_id' => $admin->id,
            'action_type' => $decision === 'unlock' ? 'unlock_pin' : 'override_pin',
            'target_type' => 'pin_challenge',
            'target_id' => $challenge->id,
            'reason' => $reason,
        ]);

        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return $challenge->refresh();
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

    private function hash(string $code): string
    {
        return hash('sha256', 'pin:'.$code);
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function record(Shipment $shipment, ?Courier $courier, array $metadata, string $actorType = 'courier'): void
    {
        DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier?->id,
            'event_type' => 'pin_verification',
            'actor_type' => $actorType,
            'metadata' => $metadata,
        ]);
    }
}
