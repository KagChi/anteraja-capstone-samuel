<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class AuditAccessLog extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = ['actor_type', 'actor_id', 'shipment_id', 'action', 'context', 'accessed_at'];

    protected function casts(): array
    {
        return ['context' => 'array', 'accessed_at' => 'datetime'];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }
}
