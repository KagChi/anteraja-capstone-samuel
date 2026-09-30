<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class AnomalyFlag extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = ['shipment_id', 'flag_type', 'weight', 'details', 'detected_at', 'is_resolved'];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'weight' => 'decimal:2',
            'is_resolved' => 'boolean',
            'detected_at' => 'datetime',
        ];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
