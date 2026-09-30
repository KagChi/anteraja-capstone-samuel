<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class PinChallenge extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'recipient_id', 'code_hash', 'attempts', 'max_attempts',
        'resend_count', 'status', 'expires_at', 'verified_at', 'locked_at',
        'override_by', 'override_reason', 'override_at',
    ];

    protected function casts(): array
    {
        return [
            'attempts' => 'integer',
            'max_attempts' => 'integer',
            'resend_count' => 'integer',
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'locked_at' => 'datetime',
            'override_at' => 'datetime',
        ];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function recipient()
    {
        return $this->belongsTo(Recipient::class);
    }

    public function overrideBy()
    {
        return $this->belongsTo(Admin::class, 'override_by');
    }

    public function deliveries()
    {
        return $this->hasMany(PinDelivery::class);
    }
}
