<?php

namespace App\Http\Requests\Api\V1\Courier;

use Illuminate\Foundation\Http\FormRequest;

class ProposeMeetingPointRequest extends FormRequest
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
            // The buyer's position is optional: when the courier can confirm
            // it (by phone or in person) the destination -> buyer distance
            // feeds the FR-04-03 "perlu titik temu" marker.
            'buyer_latitude' => ['nullable', 'required_with:buyer_longitude', 'numeric', 'between:-90,90'],
            'buyer_longitude' => ['nullable', 'required_with:buyer_latitude', 'numeric', 'between:-180,180'],
        ];
    }
}
