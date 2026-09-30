<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class PinDelivery extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = [
        'pin_challenge_id', 'channel', 'destination', 'attempt_no',
        'status', 'provider_message_id', 'sent_at',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'created_at' => 'datetime'];
    }

    public function challenge()
    {
        return $this->belongsTo(PinChallenge::class, 'pin_challenge_id');
    }
}
