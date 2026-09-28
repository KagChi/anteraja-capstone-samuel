# Anteraja Capstone — Samuel

This capstone project focuses on geolocation-based shipping, using location data to estimate delivery routes, coverage areas, and transit times between origin and destination. The goal is to help users understand where a shipment is and how long it will take to arrive based on real geographic distance rather than static rate tables.

The project will combine shipping-rate logic with coordinate-based mapping so that distance, service type, and destination region all influence the calculated cost and estimated arrival. It is intended as a foundation that can grow into a tracking or rate-estimation feature during the bootcamp.

This repository is organized with `src/` for application code and `docs/` for design notes and supporting documentation. Configuration and credentials are kept out of version control through a local `.env` file, with `.env.example` provided as a safe template.

## Prototype (branch `7-prototype`)

The interactive prototype is a React + Vite + TypeScript SPA styled with
Tailwind CSS v4. It ports the earlier static HTML prototype into components and
routes while keeping the JSON-LD, semantic markup, and accessibility contracts.
See [`docs/prototype/README.md`](./docs/prototype/README.md) for the full map of
screens, PRD/FRD coverage, and interactions.

## React Refactor — Komponen Modular (branch `8-react`)

Halaman **Dashboard Pengiriman** (`/admin/dashboard`) dipecah menjadi komponen
fungsional modular dengan aliran data satu arah. Komponen anak bersifat
presentasional: seluruh state dan mock dataset dimiliki oleh komponen induk dan
diturunkan melalui props. Tidak ada fitur atau data di luar PRD/FRD yang
ditambahkan — refaktor ini murni memecah UI yang sudah ada.

### Tree of Components

```text
DashboardPage                       (induk — pemilik state + mock dataset)
├── <header>
│   ├── DashboardHeader             eyebrow, shift, title, description
│   └── DashboardStats              total, reviewCount, verifiedCount
├── ShipmentFilters                 controlled filter + pencarian
└── ShipmentList                    shipments
    ├── ShipmentItem                shipment  (.map + key unik)
    └── ShipmentEmptyState          colSpan   (conditional, saat data kosong)
```

### Alur Props (parent → child)

| Komponen | Props | Sumber |
|---|---|---|
| `DashboardHeader` | `eyebrow`, `shift`, `title`, `description` | literal di parent |
| `DashboardStats` | `total`, `reviewCount`, `verifiedCount` | `reviewCount` dihitung dari `SHIPMENT_ROWS` |
| `ShipmentFilters` | `status`, `service`, `region`, `search` + `onStatusChange`, `onServiceChange`, `onRegionChange`, `onSearchChange` | state parent + setter |
| `ShipmentList` | `shipments: DeliveryRow[]` | hasil filter parent |
| `ShipmentItem` | `shipment: DeliveryRow` | satu item dari `.map()` di `ShipmentList` |
| `ShipmentEmptyState` | `colSpan` | literal di `ShipmentList` |

Data mengalir satu arah: state di `DashboardPage` → props → komponen anak. Anak
tidak pernah memutasi props; perubahan dilakukan lewat callback yang memanggil
setter state di parent.

### State (useState, dimiliki `DashboardPage`)

| State | Tipe | Fungsi |
|---|---|---|
| `status` | `StatusFilter` (`"all" \| DeliveryFlag`) | tab status aktif |
| `service` | `string` | filter layanan |
| `region` | `string` | filter wilayah |
| `search` | `string` | kata kunci (di-debounce via `useDebouncedValue`) |

### Dynamic list & conditional rendering

- `ShipmentList` merender item dengan `.map()` dan `key={shipment.id}`.
- `ShipmentItem` memakai conditional rendering: label aksi `delivered` →
  "Detail", selain itu "Tinjau"; baris `highlight` memakai ternary class.
- `ShipmentList` menampilkan `ShipmentEmptyState` saat `shipments.length === 0`.

### Commit modular

| Commit | Isi |
|---|---|
| `refactor(dashboard)` | `DashboardHeader` + `DashboardStats` |
| `refactor(dashboard)` | `ShipmentFilters` (controlled) |
| `refactor(dashboard)` | `ShipmentItem` (conditional status) |
| `refactor(dashboard)` | `ShipmentList` + `ShipmentEmptyState` |
| `refactor(dashboard)` | komposisi `DashboardPage` |
| `docs(readme)` | bagian ini |

### Sistem Tombol (`src/components/ui/Button.tsx`)

Seluruh tombol dan CTA kini diturunkan dari satu komponen polimorfik `Button`.
Elemen dirender sebagai `<button>`, `<a>`, atau `<Link>` lewat prop `as`
(`button` | `a` | `link`), dengan varian visual:

| Variant | Kegunaan |
|---|---|
| `primary` | Aksi utama (magenta) — login, simpan, setujui, terapkan |
| `secondary` / `outline` / `ghost` | Aksi sekunder, tolak, batalkan |
| `text` / `textNeutral` / `textInverse` | Tautan/aksi inline berikon |
| `icon` / `iconInverse` | Tombol ikon persegi (tutup, toggle, stepper) |
| `tab` | Tab/segmen (`role="tab"`, `aria-selected`) |
| `nav` | Item navigasi bawah (`aria-current`) |

Props lain: `size` (`sm` | `md` | `lg` | `xl`), `shape` (`default` | `pill`),
`active`, dan `busy`/`busyText` untuk status memuat. `LoadingButton` dan
`LoadingLink` (`LoadingAction.tsx`) membungkus `Button` sehingga gaya serta
perilaku loader memakai satu sumber yang sama. Atribut `id`, `data-*`, dan
`aria-*` tetap diteruskan apa adanya untuk menjaga kontrak pengujian.

## Stack

- **Runtime/build:** Bun + Vite
- **UI:** React 19 + React Router
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, `@tailwindcss/forms`) — design tokens in `src/index.css`
- **Language:** TypeScript (strict)
- **Lint/format:** Biome

## Commands

```sh
bun install        # install dependencies
bun run dev        # start the dev server
bun run build      # type-check (tsc -b) + production build
bun run preview    # preview the production build
bun run lint       # Biome lint + format check
bun run format     # Biome write formatting
bun run check      # Biome check with safe fixes
```
