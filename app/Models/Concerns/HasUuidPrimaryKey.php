<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

trait HasUuidPrimaryKey
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected static function bootHasUuidPrimaryKey(): void
    {
        static::creating(function ($model): void {
            $key = $model->getKeyName();

            if (empty($model->{$key})) {
                $model->{$key} = (string) Str::uuid();
            }
        });
    }
}
