<?php

namespace App\Http\Requests\Api\V1\Courier;

use App\Http\Requests\Api\V1\Courier\Concerns\ValidatesGpsSignals;
use Illuminate\Foundation\Http\FormRequest;

class StoreGpsLockRequest extends FormRequest
{
    use ValidatesGpsSignals;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
            ...$this->gpsSignalRules(required: false),
        ];
    }
}
