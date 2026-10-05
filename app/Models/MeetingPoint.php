<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use App\Support\Geo\Point;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class MeetingPoint extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'proposed_by_type', 'proposed_by_id', 'proposed_point',
        'buyer_point',
        'distance_from_destination_m', 'distance_from_buyer_m', 'status',
        'approved_by_type', 'approved_by_id', 'expires_at', 'resolved_at',
    ];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'resolved_at' => 'datetime'];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Projects the geography columns as lat/lng pairs alongside the row (the
     * same trick the delivery events/proofs relations use) so presenters do
     * not have to re-parse EWKB one column at a time.
     */
    public function scopeWithPointProjections($query)
    {
        [$lat, $lng] = Point::latLngExpression('proposed_point');
        [$buyerLat, $buyerLng] = Point::latLngExpression('buyer_point');

        return $query
            ->select('meeting_points.*')
            ->addSelect(
                DB::raw($lat.' as point_lat'),
                DB::raw($lng.' as point_lng'),
                DB::raw($buyerLat.' as buyer_lat'),
                DB::raw($buyerLng.' as buyer_lng'),
            );
    }
}
