<?php

namespace App\Models\Concerns;

trait HasUuidPrimaryKey
{
    public $incrementing = false;

    protected $keyType = 'string';
}
