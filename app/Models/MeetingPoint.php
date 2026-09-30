<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class MeetingPoint extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'proposed_by_type', 'proposed_by_id', 'proposed_point',
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
}
