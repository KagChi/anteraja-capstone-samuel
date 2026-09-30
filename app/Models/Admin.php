<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Model;

class Admin extends Model
{
    use HasUuidPrimaryKey;

    protected $fillable = ['name', 'email', 'role', 'service_area_id', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class);
    }

    public function actions()
    {
        return $this->hasMany(AdminAction::class);
    }
}
