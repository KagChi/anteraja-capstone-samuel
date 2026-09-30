<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class ServiceArea extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = ['code', 'name', 'city', 'center', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function couriers()
    {
        return $this->hasMany(Courier::class);
    }

    public function admins()
    {
        return $this->hasMany(Admin::class);
    }

    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }
}
