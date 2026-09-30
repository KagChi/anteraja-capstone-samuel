<?php

declare(strict_types=1);

namespace Anteraja\Controllers;

use Anteraja\Http\Request;
use Anteraja\Http\Response;
use Anteraja\Repositories\TaskRepository;

final class TaskController
{
    public function __construct(private readonly TaskRepository $tasks) {}

    public function index(Request $request): never
    {
        $tasks = $this->tasks->all();

        Response::json(['data' => $tasks, 'meta' => ['total' => count($tasks)]]);
    }

    public function show(Request $request, string $tracking): never
    {
        $task = $this->tasks->find(rawurldecode($tracking));
        if ($task === null) {
            Response::json(['error' => 'Tugas tidak ditemukan'], 404);
        }

        Response::json(['data' => $task]);
    }
}
