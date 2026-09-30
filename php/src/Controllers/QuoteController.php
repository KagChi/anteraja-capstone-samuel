<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Services\ShippingCalculator;
use InvalidArgumentException;

final class QuoteController
{
    public function __construct(private readonly ShippingCalculator $calculator) {}

    public function index(Request $request): never
    {
        $weight = $this->number($request->query('weight'));
        $distance = $this->number($request->query('distance'));

        if ($weight === null || $distance === null) {
            Response::json(['error' => 'Parameter weight dan distance wajib berupa angka'], 422);
        }

        try {
            Response::json(['data' => $this->calculator->quote($weight, $distance)]);
        } catch (InvalidArgumentException $exception) {
            Response::json(['error' => $exception->getMessage()], 422);
        }
    }

    private function number(?string $value): ?float
    {
        return $value !== null && is_numeric($value) ? (float) $value : null;
    }
}
