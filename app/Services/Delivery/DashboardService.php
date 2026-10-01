<?php

namespace App\Services\Delivery;

use App\Support\CacheTtl;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Admin dashboard summary counts.
 *
 * Computed with a single aggregate query so the endpoint does not hydrate
 * every shipment (plus its relations) just to count flags in PHP.
 */
class DashboardService
{
    public const CACHE_KEY = 'dashboard.summary';

    /**
     * @return array{total: int, reviewCount: int, verifiedCount: int, shift: string}
     */
    public function summary(): array
    {
        return Cache::remember(self::CACHE_KEY, CacheTtl::seconds(), function (): array {
            $counts = DB::selectOne(<<<'SQL'
                SELECT
                    count(*)::int AS total,
                    count(*) FILTER (
                        WHERE NOT has_pending
                          AND status = 'delivered'
                          AND NOT needs_review
                    )::int AS verified_count,
                    count(*) FILTER (
                        WHERE NOT has_pending
                          AND NOT (status = 'delivered' AND NOT needs_review)
                    )::int AS review_count
                FROM (
                    SELECT
                        s.status,
                        EXISTS (
                            SELECT 1 FROM delivery_exceptions e
                            WHERE e.shipment_id = s.id AND e.status = 'pending'
                        ) AS has_pending,
                        (
                            coalesce((
                                SELECT sum(a.weight) FROM anomaly_flags a
                                WHERE a.shipment_id = s.id AND NOT a.is_resolved
                            ), 0) >= 2.0
                            OR EXISTS (
                                SELECT 1 FROM delivery_proofs p
                                WHERE p.shipment_id = s.id AND p.review_status = 'needs_review'
                            )
                        ) AS needs_review
                    FROM shipments s
                ) AS ranked
                SQL);

            return [
                'total' => (int) ($counts->total ?? 0),
                'reviewCount' => (int) ($counts->review_count ?? 0),
                'verifiedCount' => (int) ($counts->verified_count ?? 0),
                'shift' => 'Shift Aktif (08:00 - 20:00)',
            ];
        });
    }
}
