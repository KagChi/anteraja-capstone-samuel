<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Support\Geo\Point;
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
        return $this->hasMany(DeliveryProof::class);
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
            'deliveryExceptions', 'anomalyFlags',
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
}
