<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class DeliveryException extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'courier_id', 'event_id', 'requested_point', 'distance_m',
        'radius_m', 'reason', 'status', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function event()
    {
        return $this->belongsTo(DeliveryEvent::class, 'event_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }
}
