<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class ClaimCase extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = [
        'shipment_id', 'case_number', 'opened_by', 'status', 'summary',
        'resolution', 'closed_by', 'closed_at',
    ];

    protected function casts(): array
    {
        return ['closed_at' => 'datetime'];
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    public function openedBy()
    {
        return $this->belongsTo(Admin::class, 'opened_by');
    }

    public function closedBy()
    {
        return $this->belongsTo(Admin::class, 'closed_by');
    }

    public function findings()
    {
        return $this->hasMany(ClaimFinding::class);
    }
}
