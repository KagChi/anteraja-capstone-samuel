<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

/**
 * FRD-06: a courier's request for admin review of a GPS lock, and the
 * admin's decision that unlocks the completion gate for the shipment.
 */
class GpsLockRequest extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'courier_id', 'point', 'accuracy_m', 'evidence',
        'reason', 'status', 'reviewed_by', 'reviewed_at', 'review_note',
    ];

    protected function casts(): array
    {
        return [
            'evidence' => 'array',
            'accuracy_m' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(Admin::class, 'reviewed_by');
    }
}
