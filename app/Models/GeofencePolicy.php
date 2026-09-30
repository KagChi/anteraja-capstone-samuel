<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class GeofencePolicy extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'service_type', 'default_radius_m', 'requires_pin', 'sla_minutes',
        'pin_length', 'pin_max_attempts', 'pin_ttl_minutes', 'pin_max_resends',
        'protocol_version', 'updated_by',
    ];

    protected function casts(): array
    {
        return ['requires_pin' => 'boolean'];
    }

    public function updatedBy()
    {
        return $this->belongsTo(Admin::class, 'updated_by');
    }
}
