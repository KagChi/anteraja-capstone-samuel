<?php

namespace App\Services\Audit;

use App\Models\AuditAccessLog;
use App\Support\Date;

/**
 * Records audit-trail access (FRD-05-09).
 */
class AuditService
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(string $action, string $actorType, string $actorId, string $shipmentId, array $context = []): AuditAccessLog
    {
        return AuditAccessLog::create([
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'shipment_id' => $shipmentId,
            'action' => $action,
            'context' => $context,
            'accessed_at' => Date::now(),
        ]);
    }
}
