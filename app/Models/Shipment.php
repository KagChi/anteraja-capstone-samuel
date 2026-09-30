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
        'status', 'pin_required', 'cod_amount', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'pin_required' => 'boolean',
            'cod_amount' => 'integer',
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
}
