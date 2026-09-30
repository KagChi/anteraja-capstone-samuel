<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Repositories\ExceptionRepository;

final class ExceptionController
{
    public function __construct(private readonly ExceptionRepository $exceptions) {}

    public function index(Request $request): never
    {
        $rows = $this->exceptions->all();

        Response::json(['data' => $rows, 'meta' => ['total' => count($rows)]]);
    }

    public function show(Request $request, string $id): never
    {
        $row = $this->exceptions->find(rawurldecode($id));
        if ($row === null) {
            Response::json(['error' => 'Pengecualian tidak ditemukan'], 404);
        }

        Response::json(['data' => $row]);
    }
}
