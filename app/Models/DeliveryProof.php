<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class DeliveryProof extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = [
        'shipment_id', 'courier_id', 'photo_path', 'point',
        'distance_to_destination_m', 'captured_at', 'device_captured_at',
        'watermark_hash', 'watermark_address', 'recipient_name',
        'relation',
        'review_status', 'review_note', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'device_captured_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'created_at' => 'datetime',
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

    public function scopeValid($query)
    {
        return $query->where('review_status', 'valid');
    }
}
