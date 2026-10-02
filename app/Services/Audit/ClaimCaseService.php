<?php

namespace App\Services\Audit;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\ClaimCase;
use App\Models\ClaimFinding;
use App\Models\Shipment;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ExceptionService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Claim-case closure from the audit trail (FRD-05).
 *
 * Closing a case never removes evidence: it records the resolution, the
 * deciding admin and the access in the audit trail, and resolves the
 * shipment's open anomaly flags so it stops surfacing as "perlu tinjauan".
 */
class ClaimCaseService
{
    public function __construct(private readonly AuditService $audit) {}

    public function close(Shipment $shipment, Admin $admin, string $decision, ?string $note = null): ClaimCase
    {
        $closed = $decision === 'approved';

        return DB::transaction(function () use ($shipment, $admin, $closed, $decision, $note): ClaimCase {
            $case = $shipment->claimCases()->latest('created_at')->first()
                ?? ClaimCase::create([
                    'shipment_id' => $shipment->id,
                    'case_number' => $this->nextCaseNumber(),
                    'opened_by' => $admin->id,
                    'status' => 'open',
                    'summary' => 'Kasus dibuka dari peninjauan audit trail.',
                ]);

            $case->update([
                'status' => $closed ? 'closed' : 'investigating',
                'resolution' => $closed ? $note : null,
                'closed_by' => $closed ? $admin->id : null,
                'closed_at' => $closed ? Date::now() : null,
            ]);

            if (! $closed) {
                ClaimFinding::create([
                    'claim_case_id' => $case->id,
                    'admin_id' => $admin->id,
                    'finding' => $note ?: 'Kasus ditandai untuk investigasi lebih lanjut.',
                ]);
            }

            AdminAction::create([
                'admin_id' => $admin->id,
                'action_type' => $closed ? 'close_claim' : 'review_pod',
                'target_type' => 'claim_case',
                'target_id' => $case->id,
                'reason' => $note,
            ]);

            if ($closed) {
                $shipment->anomalyFlags()
                    ->where('is_resolved', false)
                    ->update(['is_resolved' => true]);
            }

            $this->audit->log('close_case', 'admin', $admin->id, $shipment->id, [
                'case' => $case->case_number,
                'decision' => $decision,
            ]);

            $this->forgetCaches();

            return $case->refresh();
        });
    }

    private function nextCaseNumber(): string
    {
        $period = Date::now()->format('ym');
        $sequence = ClaimCase::query()
            ->where('case_number', 'like', "CLM-{$period}-%")
            ->count() + 1;

        do {
            $number = sprintf('CLM-%s-%04d', $period, $sequence);
            $sequence++;
        } while (ClaimCase::query()->where('case_number', $number)->exists());

        return $number;
    }

    private function forgetCaches(): void
    {
        Cache::forget(ExceptionService::PENDING_COUNT_CACHE_KEY);
        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();
    }
}
