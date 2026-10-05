<?php

namespace App\Http\Requests\Api\V1\Courier\Concerns;

/**
 * FRD-06: the fix-quality signals the courier app attaches to every GPS-gated
 * call. They are validated strictly (shape, ranges, size) before the server
 * re-derives its own verdict.
 */
trait ValidatesGpsSignals
{
    /**
     * @return array<string, mixed>
     */
    protected function gpsSignalRules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'nullable';

        return [
            'accuracy' => [$presence, 'numeric', 'min:0', 'max:10000'],
            'device_timestamp' => [$presence, 'date'],
            'speed' => ['nullable', 'numeric'],
            'heading' => ['nullable', 'numeric', 'between:0,360'],
            'altitude' => ['nullable', 'numeric'],
            'client_flags' => ['nullable', 'array', 'max:10'],
            'client_flags.*' => ['string', 'max:40'],
            'fixes' => [$presence, 'array', $required ? 'min:1' : 'max:60', 'max:60'],
            'fixes.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'fixes.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'fixes.*.accuracy' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'fixes.*.timestamp' => ['required', 'date'],
        ];
    }
}
