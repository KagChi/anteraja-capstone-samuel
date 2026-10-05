<?php

namespace App\Http\Requests\Api\V1\Courier;

use Illuminate\Foundation\Http\FormRequest;

class StoreProofRequest extends FormRequest
{
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
            'recipient_name' => ['required', 'string', 'max:120'],
            'relation' => ['nullable', 'string', 'max:60'],
            'device_captured_at' => ['nullable', 'date'],
            // FR-02-01/02: the POD photo is mandatory and must come from the
            // in-app camera capture (the client offers no gallery path).
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ];
    }
}
