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
bun run test:e2e   # Playwright (needs the app served on :8123); the courier
                   # spec mocks the device GPS fix and uses Chromium's fake
                   # camera to exercise the full POD flow
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
