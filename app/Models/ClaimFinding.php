<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class ClaimFinding extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = ['claim_case_id', 'admin_id', 'finding'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function claimCase()
    {
        return $this->belongsTo(ClaimCase::class);
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class);
    }
}
