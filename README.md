# Anteraja Instant — Delivery Integrity Prototype

Capstone prototype for **Anteraja Instant**: a courier (Satria) PWA and an
Admin/Hub console that verify delivery integrity with geofencing, recipient
PIN, time-stamped proof-of-delivery (POD) and an auditable exception queue.

The app is a Laravel 13 + Inertia.js v2 + React 19 + TypeScript monolith
backed by PostgreSQL/PostGIS.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Backend    | Laravel 13 (PHP 8.3+), Eloquent, raw PostGIS SQL    |
| Runtime    | FrankenPHP 1 (Caddy) + Laravel Octane worker mode   |
| Frontend   | Inertia.js v2, React 19, TypeScript, Tailwind v4    |
| Database   | PostgreSQL 16 + PostGIS 3.4 (Supabase-compatible)   |
| Cache/Queue| `file`/`database` by default, optional Redis        |
| Tooling    | Vite 7, Biome, Vitest, Playwright, PHPUnit, Pint    |

## Domain

- **Geofence** — server-side `ST_Distance` against the destination point.
- **PIN** — hashed recipient challenge with attempt limits, lock-out, and an
  admin dashboard to unlock or override with a recorded reason.
- **POD** — in-app camera photo watermarked server-side (coordinates, address,
  recipient name, server time) and stored as a private object on the `pod`
  disk — S3 when `POD_DISK=s3` — reachable only through short-lived signed
  URLs.
- **Anomaly scoring** — weighted flags surface shipments needing review.
- **Fake-GPS detection** — the courier app ships fix-quality signals and the
  server blocks POD + completion on strong evidence (mock-provider accuracy,
  frozen coordinates, impossible travel); a blocked courier can request an
  admin review that unlocks the shipment while the incident stays flagged.
- **Exception queue** — couriers can request an out-of-radius exception that
  an admin approves or rejects; decisions are written to the audit trail.

Requirements live in `docs/` (PRD and FRDs); the canonical schema and seed
data live in `docs/db/`.

## Requirements

- PHP 8.3+ with `pdo_pgsql` and `bcmath`
- Composer
- Bun (or Node 20+)
- Docker (for the PostGIS container, and the optional Redis container)
- Optional: phpredis (`ext-redis` ^6.0) when using the Redis backends
- Optional: the `frankenphp` binary if you run the Octane worker outside
  Docker; the image below already bundles it

## Getting started

```bash
composer install
bun install
cp .env.example .env
php artisan key:generate
```

Start PostGIS (and, optionally, Redis) with Docker Compose:

```bash
docker compose up -d          # PostGIS + Redis
docker compose up -d postgis  # PostGIS only
```

The PostGIS service matches the `.env.example` defaults (host port `55432`).
The equivalent one-off command is:

```bash
docker run --name anteraja-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=anteraja -p 55432:5432 -d postgis/postgis:16-3.4
```

Migrate and seed the demo dataset, then run the app:

```bash
php artisan migrate --seed
bun run dev        # Vite
php artisan serve  # http://127.0.0.1:8000
```

### Run the whole stack in Docker (FrankenPHP)

The image serves the app through FrankenPHP in Laravel Octane worker mode, so
Laravel boots once per worker instead of once per request:

```bash
docker compose --profile app up -d --build   # PostGIS + the app on :8080
docker compose --profile app exec -T app php artisan migrate --seed --force
```

The `app` service sits behind the `app` profile, so a plain
`docker compose up -d` still starts only the datastores. Caddy answers for
`public/build` and the rest of the static files, and only application routes
reach PHP. The service keeps sessions and the read caches on the Redis service
(see "Optional: Redis" below); the file drivers serialise on one hot session
file under concurrent load.

Every build stage stays on a Debian/glibc base (`oven/bun:1-debian`,
`php:8.4-cli-bookworm`, `dunglas/frankenphp:1-php8.4-bookworm`). Bun, PHP and
FrankenPHP each publish a musl variant, and the app does not target musl.

## Serving in production (FrankenPHP + Octane)

The container starts `php artisan octane:frankenphp`, which keeps a booted
Laravel application per worker. Octane restores the per-request state (auth
guard, session, config sandbox, Inertia shared props) before every request and
recycles each worker after `--max-requests` requests:

```bash
php artisan octane:frankenphp --host=0.0.0.0 --port=8080 \
  --workers=8 --max-requests=500
```

Set `--workers` to fit the pod's CPU and memory budget;
`deploy/kubernetes.yaml` passes it on the `web` container, while the queue
worker still runs `php artisan queue:work`. `OCTANE_SERVER=frankenphp` is
only read by the other `octane:*` commands.

## Performance

`php artisan serve` boots the framework on every request; Octane boots it once
per worker. Worker mode only removes that boot, so it gains most where a request
is CPU-bound and least where the request waits on I/O. Measured on one machine
(arm64 Mac, OrbStack, 10 cores, 8 workers, `ab` sharing the app's network
namespace, 1,500–3,000 requests per run). Treat the figures as directional: it
is a shared laptop and repeat runs move by 20–30%.

| Request | `php artisan serve` | FrankenPHP + Octane | Change |
| ------- | -------------------- | ------------------- | ------ |
| `GET /up` | ~740 req/s | 6,200–7,500 req/s | ~9× |
| `GET /login` | ~710 req/s | 3,000–3,600 req/s | ~4.5× |
| `GET /api/v1/courier/tasks?per_page=10` | ~700 req/s | 1,500–1,900 req/s | ~2.4× |
| `GET /api/v1/shipments?per_page=10` | ~460 req/s | 1,500–1,800 req/s | ~3.4× |

An authenticated JSON request also reads and writes its session, reads the
presentation caches and runs two or three queries, and none of that is boot
cost. The instrumented worker answers `/up` in 0.27 ms, `/login` in 1.6 ms, a
cached task list in 2.5 ms (the user row and the courier row), and an uncached
list page in 4–5 ms. Worker mode cannot remove those round trips, which is why
the JSON endpoints gain proportionally less than the rendered pages.

Two changes beyond swapping the runtime:

- **Sessions and cache on Redis.** With the `file` drivers every request reads
  and writes a session file; with one hot session that serialises, showing up as
  a p99 near 25 ms and a ceiling around 1.6–1.9k req/s. Pointing the stores at
  Redis removed the tail (p99 3–12 ms) and lifted the JSON endpoints by roughly
  20–25% (`/login` 3.0–3.6k → 4.1–4.3k req/s). The Compose `app` service now
  does this, and the cluster already runs Dragonfly.
- **Warm the cache with the page size the UI reads.** The tables ask for
  `per_page=10` while `app:warm-cache` primed 100/200, so those keys were
  never read and the first page load after a deploy paid the full list query. It
  now warms both sizes.

Raising `--workers` past 8 did not help (8/16/32/64 all landed near 2k req/s),
so the ceiling is per-request I/O rather than concurrency. The database is not
the limit either: a single connection runs about 15k primary-key lookups per
second and the list query is ~1.5 ms warm. It is still worth keeping the query
count low, because against a remote Postgres every query is a network round
trip.

## Optional: Redis

Redis is opt-in; the app ships on the `file`/`database` drivers. To route the
cache, queue and sessions through Redis:

1. Install phpredis (`pecl install redis`), then `docker compose up -d redis`.
2. Flip the drivers in `.env`:

   ```dotenv
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   SESSION_DRIVER=redis
   ```

3. Apply the config: `php artisan config:clear`.

The queue worker started by `composer dev` (`queue:listen`) then consumes from
Redis automatically, and the presentation read caches (shipments, dashboard,
radius) use the `cache` connection (`REDIS_CACHE_DB=1`). Set `REDIS_PREFIX` /
`CACHE_PREFIX` to keep keys namespaced when sharing a server.

Redis is optional, so no extension is required to install or run the default
setup. The `redis`-tagged test suite (`php artisan test --group redis`) skips
when Redis is unavailable, and the CI pipeline includes a non-blocking Redis
job that exercises it when present.

## Proof-of-delivery storage (S3)

POD photos are **private** objects on the dedicated `pod` disk. With the
default `POD_DISK=local` they live under `storage/app/private/pod`; set
`POD_DISK=s3` plus the `AWS_*` variables to store them in AWS S3 or an
S3-compatible service (Supabase Storage, MinIO, ...; set `AWS_ENDPOINT` and
`AWS_USE_PATH_STYLE_ENDPOINT=true` where needed). The admin console never
reads the raw path: it requests a short-lived **signed URL**, and when the
disk is S3 that request is answered with the object's presigned URL.

## Demo accounts

| Role   | Email                              | Password |
| ------ | ---------------------------------- | -------- |
| Courier| budi.pratama@anteraja.example.com  | password |
| Admin  | windy.kusuma@anteraja.example.com  | password |

The courier owns the active shipments `AJ2509000011` and `AJ2509000012`.

## API

All JSON endpoints live under `/api/v1` and use the PRD envelope:

```json
{ "success": true, "data": {}, "error": null, "meta": {} }
```

Key routes:

- `GET  /api/v1/courier/tasks`, `GET /api/v1/courier/tasks/{tracking}`
- `POST /api/v1/courier/tasks/{tracking}/pin` and `.../pin/verify`
- `POST /api/v1/courier/tasks/{tracking}/proof`
- `POST /api/v1/courier/tasks/{tracking}/exception`
- `POST /api/v1/courier/tasks/{tracking}/gps-lock`
- `GET  /api/v1/courier/history`, `GET /api/v1/courier/profile`
- `POST /api/v1/courier/tasks/{tracking}/complete`
- `GET  /api/v1/shipments`, `GET /api/v1/shipments/{id}`
- `GET  /api/v1/shipping/quote?weight=&distance=`
- `GET  /api/v1/regions/provinces`, `GET /api/v1/regions/regencies/{id}`,
  `GET /api/v1/postal/search?q=` — same-origin proxies; the wilayah and
  kodepos upstreams are only called server-side and cached
- `GET  /api/v1/admin/dashboard`
- `POST /api/v1/admin/shipments/{id}/close-case`
- `GET  /api/v1/admin/exceptions`, `POST /api/v1/admin/exceptions/{id}/decision`
- `GET  /api/v1/admin/gps-locks`, `POST /api/v1/admin/gps-locks/{id}/decision`
- `GET  /api/v1/admin/pin-locks`, `POST /api/v1/admin/pin-locks/{id}/decision`
- `GET  /api/v1/admin/shipments/{id}/audit-export` (CSV, access logged)
- `GET  /api/v1/admin/radius-segments`, `PUT /api/v1/admin/radius-segments`
- `POST /api/v1/admin/proofs/{id}/review` (FR-02-09 invalidate/restore a POD)
- `GET  /api/v1/admin/proofs/{id}/photo` (signed, admin-only POD object)

All list endpoints — `GET /api/v1/shipments`, `GET /api/v1/admin/exceptions`
and `GET /api/v1/courier/tasks` — are **cursor-paginated**: pass `?per_page=`
and resume with the opaque `meta.next_cursor`. Responses include
`meta.next_cursor` (null on the last page) and `meta.has_more`. The admin,
exception-queue and courier-task tables page **10 rows at a time** with
previous/next controls; `GET /api/v1/admin/exceptions` also accepts
`?status=pending|approved|rejected`.

## Testing

PHP feature tests run against a PostGIS database (`anteraja_test`), configured
in `phpunit.xml`.

```bash
php artisan test   # PHPUnit: API + domain
php artisan test --group redis  # optional Redis integration (skipped without Redis)
bun run test       # Vitest: UI helpers and fetch layer
bun run test:e2e   # Playwright (needs the app served on :8123, override with
                   # E2E_BASE_URL=http://localhost:8080 for the container); the
                   # courier spec mocks the device GPS fix and uses Chromium's
                   # fake camera to exercise the full POD flow
bun run lint       # Biome
bun run typecheck  # tsc
vendor/bin/pint    # PHP formatting
```

CI runs Pint, PHPUnit, Biome, `tsc` and Vitest on every push
(`.github/workflows/ci.yml`).

## Project layout

```
app/
  Http/Controllers/Api/V1/   JSON controllers (courier, admin, shared)
  Http/Requests/Api/V1/      form requests
  Models/                    Eloquent models (UUID keys)
  Services/                  geofence, PIN, POD, delivery, radius, audit
  Support/                   presenters, geo helpers, actor helpers
database/
  migrations/                schema, PostGIS functions and views
  seeders/                   demo dataset and login accounts
resources/js/
  Pages/                     Inertia pages (courier, admin, shipments)
  Components/, Layouts/      UI building blocks
  Contexts/                  auth, shipment and toast providers
tests/                       PHPUnit, Vitest and Playwright suites
```

## License

Released for academic/capstone use.
