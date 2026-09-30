<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Courier extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = ['code', 'name', 'phone', 'service_area_id', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    public function deliveryEvents()
    {
        return $this->hasMany(DeliveryEvent::class);
    }

    public function deliveryProofs()
    {
        return $this->hasMany(DeliveryProof::class);
    }

    public function deliveryExceptions()
    {
        return $this->hasMany(DeliveryException::class);
    }
}
