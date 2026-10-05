# Decisions — FRD-02 (geotagged & watermarked POD)

Recorded per the FRD instruction that unstated conditions are decided by the
implementing agent. Each item names the choice and the reason behind it.

## Storage: private `pod` disk with an S3 mode

- POD objects never touch a public disk. A dedicated `pod` filesystem disk
  is configured in `config/filesystems.php`: `POD_DISK=s3` uses the AWS
  SDK (Flysystem S3 driver) with private visibility, while the default
  `POD_DISK=local` keeps the same private semantics under
  `storage/app/private/pod` so the app runs without cloud credentials.
- Access (FR-02-06) goes through `GET /api/v1/admin/proofs/{id}/photo`, a
  Laravel **signed** route restricted to admins. On S3 the controller answers
  with a short-lived presigned object URL; locally it streams the object with
  no public path exposed. Raw paths are never returned to the courier.
- The courier response only returns review metadata (`review_status`,
  `distance_to_destination_m`, `watermark_hash`), matching the FRD role
  table where only admins/CS can view POD contents.

## Watermark (FR-02-04/05/07)

- Rendering happens server-side with GD, before the object is written. The
  font is bundled at `resources/fonts/PlusJakartaSans.ttf` so the build is
  reproducible.
- The watermark carries the tracking number, coordinates (6-decimal
  precision), destination address, recipient name and the server timestamp in
  WIB; the photo is downscaled to a maximum width of 1080 px before stamping.
- `watermark_hash` is the SHA-256 of the canonical payload
  `tracking|coordinates|address|recipient|captured_at(UTC)`. The same values
  are stored on `delivery_proofs`, so an auditor can recompute the digest
  from the row and detect a later change (a test asserts this round-trip).
- Reverse geocoding for the address line uses the shipment's destination
  address instead of calling Nominatim during capture: the coordinates are
  printed next to it on the watermark, the geofence already binds the capture
  to that destination, and dropping the external dependency keeps capture
  deterministic. Swapping in a real reverse geocoder only changes the
  `watermark_address` source in `ProofService`.

## Timestamps

- `delivery_proofs.captured_at` / `device_captured_at` and
  `shipments.delivered_at` are persisted as **UTC instants**; the Jakarta
  wall clock is only used for display and for the watermark text. (Carbon
  values passed straight into Eloquent keep their wall-clock digits, which
  would otherwise shift a WIB value by seven hours in the audit trail.)
- `device_captured_at` is advisory: a gap larger than 15 minutes against
  the server clock marks the POD `needs_review` and raises
  `device_time_mismatch`, but the capture is still accepted and
  investigated later (FR-02-08).

## Attempts and review

- Several POD attempts per shipment are allowed, but only one stays `valid`
  (enforced by the partial unique index). A newer valid attempt supersedes
  the previous one, which is demoted to `invalid` with an explanatory note.
- FR-02-09 is implemented as `POST /api/v1/admin/proofs/{id}/review` with
  `decision=invalid|valid` and a mandatory reason when invalidating. The
  decision writes `reviewed_by`/`reviewed_at`, an `admin_actions` row
  (`review_pod` / `delivery_proof`), an `audit_access_logs` entry, and
  raises or resolves the `pod_invalid` anomaly flag (weight 3.0).

## Camera and GPS (courier app)

- FR-02-01 (no gallery uploads) is enforced client-side: the courier page only
  offers a live `getUserMedia` viewfinder plus a canvas capture, and the
  API requires the `photo` part together with valid coordinates.
- GPS uses `watchPosition` with high accuracy; the on-screen distance is a
  client-side aid only. The authoritative distance is recomputed with PostGIS
  on both the proof and the completion call, so a tampered client cannot fake
  proximity.
