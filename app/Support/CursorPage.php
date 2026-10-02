<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Keyset ("cursor") pagination shared by every list endpoint.
 *
 * The caller supplies a query already ordered by `(sql_key, sql_id)` in the
 * given direction; this helper applies the seek predicate, over-fetches one
 * row to detect a following page and encodes the opaque `next_cursor`.
 */
final class CursorPage
{
    /**
     * @param  Builder<covariant \Illuminate\Database\Eloquent\Model>  $query
     * @param  callable(object): mixed  $map
     * @return array{rows: array<int, mixed>, next_cursor: string|null}
     */
    public static function get(
        Builder $query,
        int $perPage,
        ?string $cursor,
        string $sqlKey,
        string $sqlId,
        string $direction,
        callable $map,
    ): array {
        $decoded = Cursor::decode($cursor);

        if ($decoded !== null) {
            $operator = $direction === 'asc' ? '>' : '<';
            $query->whereRaw(
                "({$sqlKey}, {$sqlId}) {$operator} (?::timestamptz, ?::uuid)",
                $decoded,
            );
        }

        $models = $query->limit($perPage + 1)->get();

        $hasMore = $models->count() > $perPage;
        $models = $models->take($perPage)->values();

        $nextCursor = null;

        if ($hasMore && $models->isNotEmpty()) {
            $last = $models->last();
            $nextCursor = Cursor::encode($last->created_at->toIso8601String(), $last->getKey());
        }

        return [
            'rows' => $models->map($map)->all(),
            'next_cursor' => $nextCursor,
        ];
    }
}
