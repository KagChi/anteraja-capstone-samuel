<?php

namespace App\Services\Verification;

use App\Exceptions\FakeGpsSuspectedException;
use App\Models\AnomalyFlag;
use App\Models\Courier;
use App\Models\DeliveryEvent;
use App\Models\GpsLockRequest;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use App\Support\Geo\Distance;
use App\Support\Geo\Point;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * FRD-06: heuristic fake-GPS detection. The courier app ships raw fix signals
 * (accuracy, device clock, recent fix window); the server re-derives what it
 * can and keeps the authoritative block decision. Strong signals reject the
 * attempt with FakeGpsSuspectedException unless an admin-approved lock
 * request covers the shipment; weak signals only mark the delivery for review.
 */
class FakeGpsDetector
{
    // Strong signals: a mock provider fingerprint, a frozen coordinate feed or
    // a teleport against the shipment's own recorded points.
    public const ACCURACY_MIN_M = 1.0;

    public const FROZEN_MIN_FIXES = 8;

    public const FROZEN_MIN_SPAN_SECONDS = 45;

    public const FROZEN_MAX_ACCURACY_M = 2.0;

    public const TRAVEL_MAX_SPEED_KMH = 200.0;

    public const TRAVEL_MIN_GAP_SECONDS = 60;

    public const TRAVEL_LOOKBACK_SECONDS = 900;

    // Weak signals: suspicious but survivable (flagged, still allowed).
    public const CLOCK_SKEW_SECONDS = 900;

    public const STALE_FIX_SECONDS = 600;

    public const TELEPORT_MAX_SPEED_KMH = 150.0;

    public const TELEPORT_MIN_GAP_SECONDS = 5;

    public const TELEPORT_MIN_DISTANCE_M = 200;

    public const DIVERSITY_MIN_SPAN_SECONDS = 45;

    public const DIVERSITY_MIN_DISTINCT_POINTS = 3;

    public const DIVERSITY_MAX_ACCURACY_M = 5.0;

    /** @var list<string> */
    public const STRONG_CODES = ['accuracy_invalid', 'frozen_fix', 'impossible_travel'];

    public const MAX_FIX_WINDOW = 60;

    /** @var array<string, string> */
    private const LABELS = [
        'accuracy_invalid' => 'Akurasi GPS tidak wajar',
        'frozen_fix' => 'Koordinat beku (tidak ada variasi sinyal)',
        'impossible_travel' => 'Perpindahan mustahil antar titik tercatat',
        'clock_skew' => 'Jam perangkat berbeda dari server',
        'stale_fix' => 'Data GPS sudah lama',
        'client_teleport' => 'Lompatan posisi tidak wajar',
        'low_diversity' => 'Variasi sinyal GPS rendah',
    ];

    /**
     * Blocks the attempt (or returns the covering override) once the fix has
     * been assessed. Suspected and blocked attempts always raise a flag.
     *
     * @param  array<string, mixed>  $signals
     * @return array{assessment: array<string, mixed>, override_id: string|null}
     */
    public function guard(
        Shipment $shipment,
        ?Courier $courier,
        float $latitude,
        float $longitude,
        array $signals = [],
    ): array {
        $assessment = $this->assess($shipment, $latitude, $longitude, $signals);
        $override = $assessment['level'] === 'blocked' ? $this->approvedOverride($shipment) : null;

        if ($assessment['level'] !== 'clean') {
            $this->flag($shipment, $assessment, $override?->id);
        }

        if ($assessment['level'] === 'blocked' && $override === null) {
            $this->recordBlocked($shipment, $courier, $latitude, $longitude, $assessment);

            throw new FakeGpsSuspectedException($assessment['reasons']);
        }

        return ['assessment' => $assessment, 'override_id' => $override?->id];
    }

    /**
     * @param  array<string, mixed>  $signals
     * @return array{
     *     level: 'clean'|'suspected'|'blocked',
     *     reasons: list<array{code: string, label: string, detail: string, severity: string}>,
     *     accuracy_m: int|null,
     *     implied_speed_kmh: float|null,
     *     fix_window: array{count: int, span_seconds: int, distinct_points: int}|null,
     *     clock_skew_seconds: int|null,
     *     client_codes: list<string>,
     * }
     */
    public function assess(Shipment $shipment, float $latitude, float $longitude, array $signals = []): array
    {
        $now = Date::now();
        $reasons = [];

        $accuracy = $this->number($signals['accuracy'] ?? null);
        $deviceAt = $this->parseDate($signals['device_timestamp'] ?? null);
        $fixes = $this->normalizeFixes($signals['fixes'] ?? []);
        $window = $this->windowStats($fixes);
        $effectiveAccuracy = $accuracy ?? ($fixes === [] ? null : end($fixes)['accuracy']);

        if ($accuracy !== null && $accuracy < self::ACCURACY_MIN_M) {
            $reasons[] = $this->reason(
                'accuracy_invalid',
                true,
                sprintf('Perangkat melaporkan akurasi ±%s m (ciri lokasi simulasi).', $this->trim($accuracy)),
            );
        }

        $frozen = $window !== null
            && $window['count'] >= self::FROZEN_MIN_FIXES
            && $window['span_seconds'] >= self::FROZEN_MIN_SPAN_SECONDS
            && $window['distinct_points'] === 1
            && $effectiveAccuracy !== null
            && $effectiveAccuracy <= self::FROZEN_MAX_ACCURACY_M;

        if ($frozen) {
            $reasons[] = $this->reason(
                'frozen_fix',
                true,
                sprintf(
                    '%d titik identik (%.6f, %.6f) selama %d detik tanpa variasi sinyal GPS.',
                    $window['count'],
                    $latitude,
                    $longitude,
                    $window['span_seconds'],
                ),
            );
        }

        $travel = $this->impossibleTravel($shipment, $latitude, $longitude, $now);

        if ($travel !== null) {
            $reasons[] = $this->reason(
                'impossible_travel',
                true,
                sprintf(
                    'Perpindahan %.2f km hanya dalam %d detik (±%.0f km/jam) dari titik tercatat terakhir.',
                    $travel['distance_m'] / 1000,
                    $travel['gap_seconds'],
                    $travel['speed_kmh'],
                ),
            );
        }

        $clockSkew = null;

        if ($deviceAt !== null) {
            $clockSkew = $now->getTimestamp() - $deviceAt->getTimestamp();

            if (abs($clockSkew) > self::CLOCK_SKEW_SECONDS) {
                $reasons[] = $this->reason(
                    'clock_skew',
                    false,
                    sprintf('Jam perangkat berbeda %d menit dari server.', intdiv(abs($clockSkew), 60)),
                );
            } elseif ($clockSkew > self::STALE_FIX_SECONDS) {
                $reasons[] = $this->reason(
                    'stale_fix',
                    false,
                    sprintf('Fix GPS terakhir sudah %d menit lalu.', intdiv($clockSkew, 60)),
                );
            }
        }

        $jump = $frozen ? null : $this->clientTeleport($fixes);

        if ($jump !== null) {

            $reasons[] = $this->reason(
                'client_teleport',
                false,
                sprintf(
                    'Lompatan %.2f km dalam %d detik (±%.0f km/jam) pada riwayat GPS sesi ini.',
                    $jump['distance_m'] / 1000,
                    $jump['gap_seconds'],
                    $jump['speed_kmh'],
                ),
            );
        }

        if (! $frozen
            && $window !== null
            && $window['span_seconds'] >= self::DIVERSITY_MIN_SPAN_SECONDS
            && $window['distinct_points'] < self::DIVERSITY_MIN_DISTINCT_POINTS
            && $effectiveAccuracy !== null
            && $effectiveAccuracy <= self::DIVERSITY_MAX_ACCURACY_M
        ) {
            $reasons[] = $this->reason(
                'low_diversity',
                false,
                sprintf(
                    'Hanya %d titik berbeda dalam %d detik terakhir padahal akurasi ±%s m.',
                    $window['distinct_points'],
                    $window['span_seconds'],
                    $this->trim($effectiveAccuracy),
                ),
            );
        }

        $level = 'clean';

        foreach ($reasons as $reason) {
            if ($reason['severity'] === 'strong') {
                $level = 'blocked';

                break;
            }

            $level = 'suspected';
        }

        return [
            'level' => $level,
            'reasons' => $reasons,
            'accuracy_m' => $accuracy !== null ? (int) round($accuracy) : null,
            'implied_speed_kmh' => $travel !== null ? round($travel['speed_kmh'], 1) : null,
            'fix_window' => $window,
            'clock_skew_seconds' => $clockSkew,
            'client_codes' => $this->clientCodes($signals['client_flags'] ?? []),
        ];
    }

    /**
     * Raises (or strengthens) the mock_gps_suspected anomaly flag. Blocked
     * incidents carry 3.00, suspected ones 2.00 - both cross the >= 2.00
     * "perlu tinjauan" threshold of v_shipment_anomaly_score.
     *
     * @param  array<string, mixed>  $assessment
     */
    public function flag(Shipment $shipment, array $assessment, ?string $overrideId = null): void
    {
        if (($assessment['level'] ?? 'clean') === 'clean') {
            return;
        }

        $weight = $assessment['level'] === 'blocked' ? 3.00 : 2.00;
        $flag = AnomalyFlag::query()->firstOrNew([
            'shipment_id' => $shipment->id,
            'flag_type' => 'mock_gps_suspected',
        ]);

        $flag->weight = max((float) ($flag->weight ?? 0), $weight);
        $flag->details = array_filter(array_merge($flag->details ?? [], [
            'level' => $assessment['level'],
            'reasons' => $assessment['reasons'],
            'accuracy_m' => $assessment['accuracy_m'],
            'implied_speed_kmh' => $assessment['implied_speed_kmh'],
            'fix_window' => $assessment['fix_window'],
            'clock_skew_seconds' => $assessment['clock_skew_seconds'],
            'client_codes' => $assessment['client_codes'],
            'override_id' => $overrideId,
        ]), static fn ($value) => $value !== null && $value !== []);
        $flag->detected_at = Date::now();
        $flag->is_resolved = false;
        $flag->save();

        // A blocked attempt writes no POD, so the detector owns invalidating
        // the cached shipment/list payloads in that path.
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();
    }

    /**
     * Keeps the blocked attempt on the audit trail even though no POD exists.
     *
     * @param  array<string, mixed>  $assessment
     */
    public function recordBlocked(
        Shipment $shipment,
        ?Courier $courier,
        float $latitude,
        float $longitude,
        array $assessment,
    ): DeliveryEvent {
        return DeliveryEvent::create([
            'shipment_id' => $shipment->id,
            'courier_id' => $courier?->id,
            'event_type' => 'gps_blocked',
            'point' => DB::raw(Point::make($latitude, $longitude)),
            'actor_type' => 'courier',
            'metadata' => [
                'level' => 'blocked',
                'reasons' => $assessment['reasons'],
                'accuracy_m' => $assessment['accuracy_m'],
            ],
        ]);
    }

    /**
     * The admin-approved lock request that unlocks the gate, if any.
     */
    public function approvedOverride(Shipment $shipment): ?GpsLockRequest
    {
        return GpsLockRequest::query()
            ->where('shipment_id', $shipment->id)
            ->where('status', 'approved')
            ->latest('created_at')
            ->first();
    }

    /**
     * @return array{distance_m: int, gap_seconds: int, speed_kmh: float}|null
     */
    private function impossibleTravel(Shipment $shipment, float $latitude, float $longitude, Carbon $now): ?array
    {
        $row = DB::selectOne(
            'SELECT ST_Y(point::geometry) AS lat, ST_X(point::geometry) AS lng, created_at
             FROM delivery_events
             WHERE shipment_id = ? AND point IS NOT NULL AND created_at >= ?
             ORDER BY created_at DESC
             LIMIT 1',
            [$shipment->id, $now->copy()->subSeconds(self::TRAVEL_LOOKBACK_SECONDS)->utc()],
        );

        if ($row === null || $row->lat === null) {
            return null;
        }

        $recordedAt = Date::jakarta($row->created_at);

        if ($recordedAt === null) {
            return null;
        }

        $gap = $now->getTimestamp() - $recordedAt->getTimestamp();

        if ($gap < self::TRAVEL_MIN_GAP_SECONDS) {
            return null;
        }

        $distance = Distance::haversineMeters(
            (float) $row->lat,
            (float) $row->lng,
            $latitude,
            $longitude,
        );
        $speed = ($distance / 1000) / ($gap / 3600);

        if ($speed <= self::TRAVEL_MAX_SPEED_KMH) {
            return null;
        }

        return ['distance_m' => $distance, 'gap_seconds' => $gap, 'speed_kmh' => $speed];
    }

    /**
     * @param  list<array{latitude: float, longitude: float, accuracy: float|null, timestamp: int, key: string}>  $fixes
     * @return array{count: int, span_seconds: int, distinct_points: int}|null
     */
    private function windowStats(array $fixes): ?array
    {
        if ($fixes === []) {
            return null;
        }

        $first = $fixes[0]['timestamp'];
        $last = $fixes[count($fixes) - 1]['timestamp'];

        return [
            'count' => count($fixes),
            'span_seconds' => max(0, $last - $first),
            'distinct_points' => count(array_unique(array_column($fixes, 'key'))),
        ];
    }

    /**
     * @param  list<array{latitude: float, longitude: float, accuracy: float|null, timestamp: int, key: string}>  $fixes
     * @return array{distance_m: int, gap_seconds: int, speed_kmh: float}|null
     */
    private function clientTeleport(array $fixes): ?array
    {
        for ($index = 1; $index < count($fixes); $index++) {
            $previous = $fixes[$index - 1];
            $current = $fixes[$index];
            $gap = $current['timestamp'] - $previous['timestamp'];

            if ($gap < self::TELEPORT_MIN_GAP_SECONDS) {
                continue;
            }

            $distance = Distance::haversineMeters(
                $previous['latitude'],
                $previous['longitude'],
                $current['latitude'],
                $current['longitude'],
            );

            if ($distance < self::TELEPORT_MIN_DISTANCE_M) {
                continue;
            }

            $speed = ($distance / 1000) / ($gap / 3600);

            if ($speed > self::TELEPORT_MAX_SPEED_KMH) {
                return ['distance_m' => $distance, 'gap_seconds' => $gap, 'speed_kmh' => $speed];
            }
        }

        return null;
    }

    /**
     * @return list<array{latitude: float, longitude: float, accuracy: float|null, timestamp: int, key: string}>
     */
    private function normalizeFixes(mixed $fixes): array
    {
        if (! is_array($fixes)) {
            return [];
        }

        $normalized = [];

        foreach ($fixes as $fix) {
            if (! is_array($fix)) {
                continue;
            }

            $latitude = $this->number($fix['latitude'] ?? null);
            $longitude = $this->number($fix['longitude'] ?? null);
            $timestamp = $this->parseDate($fix['timestamp'] ?? null);

            if ($latitude === null || $longitude === null || $timestamp === null) {
                continue;
            }

            $normalized[] = [
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy' => $this->number($fix['accuracy'] ?? null),
                'timestamp' => $timestamp->getTimestamp(),
                'key' => sprintf('%.6F,%.6F', $latitude, $longitude),
            ];
        }

        usort($normalized, static fn (array $a, array $b) => $a['timestamp'] <=> $b['timestamp']);

        return array_slice($normalized, -self::MAX_FIX_WINDOW);
    }

    /**
     * @return list<string>
     */
    private function clientCodes(mixed $codes): array
    {
        if (! is_array($codes)) {
            return [];
        }

        $allowed = array_keys(self::LABELS);

        return array_values(array_unique(array_filter(
            array_map(static fn ($code) => is_string($code) ? $code : null, $codes),
            static fn (?string $code) => $code !== null && in_array($code, $allowed, true),
        )));
    }

    /**
     * @return array{code: string, label: string, detail: string, severity: string}
     */
    private function reason(string $code, bool $strong, string $detail): array
    {
        return [
            'code' => $code,
            'label' => self::LABELS[$code] ?? $code,
            'detail' => $detail,
            'severity' => $strong ? 'strong' : 'weak',
        ];
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Date::jakarta($value)?->utc();
        } catch (\Throwable) {
            return null;
        }
    }

    private function trim(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }
}
