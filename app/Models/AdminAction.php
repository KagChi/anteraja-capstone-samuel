<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class AdminAction extends Model
{
    use HasUuidPrimaryKey;

    public $timestamps = false;

    protected $fillable = ['admin_id', 'action_type', 'target_type', 'target_id', 'reason'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function admin()
    {
        return $this->belongsTo(Admin::class);
    }
}
