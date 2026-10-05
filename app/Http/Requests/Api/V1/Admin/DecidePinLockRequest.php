<?php

namespace App\Http\Requests\Api\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DecidePinLockRequest extends FormRequest
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
            'decision' => ['required', Rule::in(['unlock', 'override'])],
            // FR-03-08: both decisions must carry a recorded reason.
            'note' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }
}
