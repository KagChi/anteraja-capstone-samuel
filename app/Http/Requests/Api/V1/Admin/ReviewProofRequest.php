<?php

namespace App\Http\Requests\Api\V1\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewProofRequest extends FormRequest
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
            'decision' => ['required', Rule::in(['invalid', 'valid'])],
            // FR-02-09: a reason is mandatory when invalidating a POD.
            'note' => ['required_if:decision,invalid', 'nullable', 'string', 'max:500'],
        ];
    }
}
