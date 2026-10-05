<?php

namespace App\Services\Verification;

use App\Models\Admin;
use App\Models\AdminAction;
use App\Models\AnomalyFlag;
use App\Models\DeliveryProof;
use App\Services\Audit\AuditService;
use App\Services\Delivery\DashboardService;
use App\Services\Delivery\ShipmentCache;
use App\Support\Date;
use Illuminate\Support\Facades\Cache;

/**
 * FR-02-09: an admin/CS can mark a POD invalid with a reason (or restore a
 * previously invalidated attempt), leaving an admin_actions and
 * audit_access_logs trail behind.
 */
class ProofReviewService
{
    public function __construct(private readonly AuditService $audit) {}

    public function review(DeliveryProof $proof, Admin $admin, string $decision, ?string $note): DeliveryProof
    {
        if ($decision === 'valid') {
            $conflict = DeliveryProof::query()
                ->where('shipment_id', $proof->shipment_id)
                ->where('review_status', 'valid')
                ->whereKeyNot($proof->id)
                ->exists();

            if ($conflict) {
                abort(422, 'Pengiriman ini sudah memiliki POD valid lain.');
            }
        }

        $proof->update([
            'review_status' => $decision,
            'review_note' => $note,
            'reviewed_by' => $admin->id,
            'reviewed_at' => Date::now()->utc(),
        ]);

        if ($decision === 'invalid') {
            AnomalyFlag::updateOrCreate(
                ['shipment_id' => $proof->shipment_id, 'flag_type' => 'pod_invalid'],
                [
                    'weight' => 3.00,
                    'details' => ['proof' => $proof->id, 'note' => $note],
                    'detected_at' => Date::now(),
                    'is_resolved' => false,
                ],
            );
        } else {
            AnomalyFlag::query()
                ->where('shipment_id', $proof->shipment_id)
                ->where('flag_type', 'pod_invalid')
                ->update(['is_resolved' => true]);
        }

        AdminAction::create([
            'admin_id' => $admin->id,
            'action_type' => 'review_pod',
            'target_type' => 'delivery_proof',
            'target_id' => $proof->id,
            'reason' => $note,
        ]);

        $this->audit->log('review_pod', 'admin', $admin->id, $proof->shipment_id, [
            'proof' => $proof->id,
            'decision' => $decision,
            'note' => $note,
        ]);

        Cache::forget(DashboardService::CACHE_KEY);
        ShipmentCache::bump();

        return $proof->refresh();
    }
}
