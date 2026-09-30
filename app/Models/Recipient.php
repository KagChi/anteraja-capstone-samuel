<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Recipient extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = ['name', 'phone', 'email'];

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function pinChallenges()
    {
        return $this->hasMany(PinChallenge::class);
    }
}
