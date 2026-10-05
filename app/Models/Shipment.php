<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Support\Geo\Point;
use App\Support\Geo\ServiceAreas;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Shipment extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'tracking_number', 'service_type', 'courier_id', 'recipient_id',
        'service_area_id', 'origin', 'destination', 'destination_address',
        'status', 'pin_required', 'cod_amount', 'weight_kg', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'pin_required' => 'boolean',
            'cod_amount' => 'integer',
            'weight_kg' => 'decimal:2',
            'delivered_at' => 'datetime',
        ];
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function recipient()
    {
        return $this->belongsTo(Recipient::class);
    }

    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class);
    }

    public function geofences()
    {
        return $this->hasMany(Geofence::class);
    }

    public function activeGeofence()
    {
        return $this->hasOne(Geofence::class)->where('is_active', true);
    }

    public function deliveryEvents()
    {
        return $this->hasMany(DeliveryEvent::class)->orderBy('created_at');
    }

    public function deliveryProofs()
    {
        [$lat, $lng] = Point::latLngExpression('point');

        // Project the proof coordinates and keep the newest attempt first, so
        // presenters can show the geotag without re-parsing EWKB.
        return $this->hasMany(DeliveryProof::class)
            ->select('delivery_proofs.*')
            ->addSelect(DB::raw($lat.' as point_lat'), DB::raw($lng.' as point_lng'))
            ->orderByDesc('captured_at');
    }

    public function pinChallenge()
    {
        return $this->hasOne(PinChallenge::class);
    }

    public function deliveryExceptions()
    {
        return $this->hasMany(DeliveryException::class);
    }

    public function meetingPoints()
    {
        return $this->hasMany(MeetingPoint::class);
    }

    public function claimCases()
    {
        return $this->hasMany(ClaimCase::class);
    }

    public function anomalyFlags()
    {
        return $this->hasMany(AnomalyFlag::class);
    }

    public function auditAccessLogs()
    {
        return $this->hasMany(AuditAccessLog::class);
    }

    public function scopeForCourier($query, string $courierId)
    {
        return $query->where('courier_id', $courierId);
    }

    public function scopeWithPresentation($query)
    {
        return $query->with([
            'courier', 'recipient', 'serviceArea', 'activeGeofence',
            'pinChallenge', 'deliveryEvents', 'deliveryProofs',
            'deliveryExceptions', 'anomalyFlags', 'claimCases.findings',
        ]);
    }

    public function scopeWithDestinationCoordinates($query)
    {
        [$lat, $lng] = Point::latLngExpression('destination');

        return $query->addSelect(
            'shipments.*',
            DB::raw($lat.' as destination_lat'),
            DB::raw($lng.' as destination_lng'),
        );
    }

    /**
     * Flat projection for the shipment list: joins the lookups and folds the
     * flag/review signals into correlated subqueries, so a page of rows is
     * one query instead of a base query plus nine eager loads.
     */
    public function scopeForListPresentation($query)
    {
        return $query
            ->leftJoin('couriers as list_courier', 'list_courier.id', '=', 'shipments.courier_id')
            ->leftJoin('recipients as list_recipient', 'list_recipient.id', '=', 'shipments.recipient_id')
            ->leftJoin('service_areas as list_area', 'list_area.id', '=', 'shipments.service_area_id')
            ->select([
                'shipments.*',
                'list_courier.name as courier_name',
                'list_courier.code as courier_code',
                'list_recipient.name as recipient_name',
                'list_area.code as area_code',
            ])
            ->addSelect([
                DB::raw("EXISTS (SELECT 1 FROM delivery_exceptions le WHERE le.shipment_id = shipments.id AND le.status = 'pending') as pending_exception"),
                DB::raw('coalesce((SELECT sum(la.weight) FROM anomaly_flags la WHERE la.shipment_id = shipments.id AND NOT la.is_resolved), 0) as anomaly_weight'),
                DB::raw("EXISTS (SELECT 1 FROM delivery_proofs lp WHERE lp.shipment_id = shipments.id AND lp.review_status = 'needs_review') as proof_needs_review"),
                DB::raw("(SELECT lp2.distance_to_destination_m FROM delivery_proofs lp2 WHERE lp2.shipment_id = shipments.id ORDER BY (lp2.review_status = 'valid') DESC LIMIT 1) as proof_distance"),
                DB::raw('(SELECT le2.distance_to_destination_m FROM delivery_events le2 WHERE le2.shipment_id = shipments.id AND le2.distance_to_destination_m IS NOT NULL ORDER BY le2.created_at DESC LIMIT 1) as latest_distance'),
                DB::raw('(SELECT lc.status FROM pin_challenges lc WHERE lc.shipment_id = shipments.id LIMIT 1) as pin_status'),
            ]);
    }

    /**
     * Server-side list filters for the shipment tables (search, flag, service
     * and region). Expects the list-presentation aliases to be present, so the
     * clauses can reuse them.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeForListFilters($query, array $filters)
    {
        $search = trim((string) ($filters['search'] ?? ''));

        if ($search !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';

            $query->where(function ($query) use ($like): void {
                $query->where('shipments.tracking_number', 'ilike', $like)
                    ->orWhereExists(function ($query) use ($like): void {
                        $query->selectRaw('1')->from('couriers as search_courier')
                            ->whereColumn('search_courier.id', 'shipments.courier_id')
                            ->where(function ($query) use ($like): void {
                                $query->where('search_courier.name', 'ilike', $like)
                                    ->orWhere('search_courier.code', 'ilike', $like);
                            });
                    })
                    ->orWhereExists(function ($query) use ($like): void {
                        $query->selectRaw('1')->from('recipients as search_recipient')
                            ->whereColumn('search_recipient.id', 'shipments.recipient_id')
                            ->where('search_recipient.name', 'ilike', $like);
                    })
                    ->orWhere('shipments.destination_address', 'ilike', $like);
            });
        }

        $pending = "EXISTS (SELECT 1 FROM delivery_exceptions le WHERE le.shipment_id = shipments.id AND le.status = 'pending')";
        $needsReview = 'coalesce((SELECT sum(la.weight) FROM anomaly_flags la WHERE la.shipment_id = shipments.id AND NOT la.is_resolved), 0) >= 2.0'
            ." OR EXISTS (SELECT 1 FROM delivery_proofs lp WHERE lp.shipment_id = shipments.id AND lp.review_status = 'needs_review')";

        match ((string) ($filters['status'] ?? '')) {
            'exception' => $query->whereRaw($pending),
            'delivered' => $query->whereRaw("NOT {$pending} AND shipments.status = 'delivered' AND NOT ({$needsReview})"),
            'review' => $query->whereRaw("NOT {$pending} AND NOT (shipments.status = 'delivered' AND NOT ({$needsReview}))"),
            default => null,
        };

        match ((string) ($filters['service'] ?? '')) {
            'instant' => $query->where('shipments.service_type', 'instant'),
            'regular' => $query->where('shipments.service_type', 'regular'),
            'sameday' => $query->whereNotIn('shipments.service_type', ['instant', 'regular']),
            default => null,
        };

        $region = $filters['region'] ?? null;
        $areaCode = ServiceAreas::codeForRegency(is_string($region) ? $region : null);

        if ($areaCode !== null) {
            $query->whereExists(function ($query) use ($areaCode): void {
                $query->selectRaw('1')->from('service_areas as search_area')
                    ->whereColumn('search_area.id', 'shipments.service_area_id')
                    ->where('search_area.code', $areaCode);
            });
        }

        return $query;
    }
}
