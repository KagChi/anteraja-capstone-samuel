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

### Peta Geofence Audit (`src/components/admin/audit/AuditTrailMap.tsx`)

Visual statis pada **Detail Audit Trail** (`/admin/audit-trail`) diganti dengan
peta interaktif **Leaflet** (`react-leaflet`). Komponen menerima `target`,
`courier`, `radiusMeters`, dan `deviationMeters` sebagai props; peta menampilkan
tile OpenStreetMap, lingkaran geofence 30 m, serta pin kustom `divIcon` untuk
titik tujuan dan posisi kurir. `scrollWheelZoom` dimatikan agar gulir halaman
tidak tersangkut, dan wadah peta diberi stacking context (`relative z-0`) supaya
panel Leaflet tidak menutupi header/drawer admin.

## Asynchronous Data Fetching — Custom Hooks & Context API (branch `8-react`)

Tidak ada halaman atau rute baru pada tahap ini. Seluruh pemanggilan Public API
dilekatkan ke **fitur yang sudah ada** (avatar profil, foto bukti/POD, filter
wilayah Dashboard, dan detail kode pos tujuan) agar state asynchronous serta
pemisahan logika dapat dilihat langsung pada UI yang sudah berjalan.

### Public API yang dikonsumsi

| API | Fungsi | Dipakai di |
|---|---|---|
| DiceBear `api.dicebear.com/9.x/initials/svg?seed=` | Foto profil | Header Tugas & Sukses, sidebar/header AdminLayout, avatar kurir AuditTrail & Pengecualian |
| Lorem Picsum `picsum.photos/seed/{resi}/640/960` | Foto bukti / POD | Viewfinder BuktiFoto, thumbnail POD AuditTrail & Pengecualian |
| emsifa `api-wilayah-indonesia` | Opsi wilayah (kabupaten/kota) | `<select>` filter Wilayah di Dashboard |
| kodepos.vercel.app | Pencarian kode pos otomatis | Detail tujuan Verifikasi & AuditTrail |

Semua endpoint bersifat publik, tanpa API key, dan mengirim header
`Access-Control-Allow-Origin: *`.

### Struktur Custom Hooks (`src/hooks/`)

| Hook | Kontrak | Perilaku efek samping |
|---|---|---|
| `useFetch<T>(url)` | `AsyncResource<T>` | `AbortController` dibatalkan saat `url` berubah/unmount, deps `[url, nonce]`, error `try/catch` |
| `usePreloadedImage(url)` | `AsyncResource<string>` | Pra-muat via `new Image()`, flag `active` di-cleanup agar tidak setState setelah unmount |
| `useAvatar(seed)` | `AsyncResource<string>` | Membungkus `usePreloadedImage` dengan URL DiceBear |
| `useProofPhoto(seed)` | `AsyncResource<string>` | Membungkus `usePreloadedImage` dengan URL Picsum |
| `useLocationData(provinceId)` | `{ provinces, regencies }` | Provinsi saat mount; kabupaten mengikuti `provinceId` (deps `[provinceId]`) |
| `usePostalSearch(query)` | `AsyncResource<PostalResult[]>` | Debounce 350 ms, hanya fetch bila query ≥ 3 karakter |

`AsyncResource<T>` adalah wujud status asynchronous yang konsisten:

```ts
interface AsyncResource<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reload: () => void;
}
```

### Arsitektur Context API (`src/context/ShipmentContext.tsx`)

```text
App
└── SessionProvider
    └── ToastProvider
        └── ShipmentProvider          createContext + useShipmentContext
            ├── useAvatar(session.name)            → courierAvatar
            ├── useProofPhoto(ACTIVE_TRACKING)     → proofPhoto
            ├── useLocationData("31")              → provinces, regencies
            └── usePostalSearch("Kebayoran Baru")  → postal, searchPostal
```

`ShipmentProvider` bertindak sebagai **central store**: seluruh hasil fetching
dikelompokkan di satu tempat, lalu dikonsumsi lewat `useShipmentContext()` tanpa
prop drilling.

| Konsumen | State context yang dipakai |
|---|---|
| `TugasPage`, `SuksesPage`, `AdminLayout` | `courierAvatar` |
| `BuktiFotoPage` | `proofPhoto` |
| `DashboardPage` + `ShipmentFilters` | `regencies` |
| `VerifikasiPage`, `AuditTrailPage` | `postal` (+ `reload`) |
| `AuditTrailPage`, `PengecualianDetailPage` | `useAvatar` / `useProofPhoto` langsung (hook reusable) |

### Penanganan status asynchronous

- **Loading:** `Spinner` pada select wilayah, kode pos tujuan, dan pratinjau foto.
- **Error:** pesan singkat + tombol "Coba lagi" yang memanggil `reload()`.
- **Fallback:** avatar kembali ke inisial, foto kembali ke ikon kamera bila gagal.
- **Anti infinite loop:** dependency array eksplisit (`[url, nonce]`,
  `[provinceId]`, `[query]`) dan nilai non-null hanya diteruskan sebagai URL
  sehingga request tidak terpicu berulang.

### Commit modular

| Commit | Isi |
|---|---|
| `feat(api)` | fetch client `fetchJson` + tipe `AsyncResource` |
| `feat(hooks)` | `useFetch` + `useAvatar` + `useProofPhoto` |
| `feat(hooks)` | `useLocationData` + `usePostalSearch` |
| `feat(context)` | `ShipmentProvider` + `useShipmentContext` |
| `feat(ui)` | avatar, POD, wilayah, dan kode pos pada layar yang sudah ada |
| `docs(readme)` | bagian ini |

## SPA Routing — React Router (branch `8-react`)

Seluruh navigasi berjalan di sisi klien (`react-router-dom`) tanpa *full page
reload*. `BrowserRouter` dipasang sekali di `App.tsx`; perpindahan antar layar
memakai `<Link>`/`<NavLink>` dan `useNavigate`.

### Route Map

| Path | Halaman | Layout | Catatan |
|---|---|---|---|
| `/` | `LandingPage` | — | pemilih peran + dialog login |
| `/courier/tugas` | `TugasPage` | `MainLayout` | daftar tugas kurir |
| `/courier/verifikasi` | `VerifikasiPage` | `MainLayout` | geofence + PIN |
| `/courier/bukti-foto` | `BuktiFotoPage` | `MainLayout` (fullscreen) | chrome disembunyikan untuk kamera |
| `/courier/sukses` | `SuksesPage` | `MainLayout` | konfirmasi sukses |
| `/shipments` | `ShipmentListPage` | `MainLayout` | daftar + pelacakan resi |
| `/shipments/:id` | `ShipmentDetailPage` | `MainLayout` | **dynamic route** (`useParams`) |
| `*` | `NotFoundPage` | `MainLayout` | fallback 404 |
| `/admin/*` | dashboard, audit, antrian, pengecualian, radius | `AdminLayout` | konsol desktop (sidebar) |

```text
<BrowserRouter>
  <ScrollToTop />
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<MainLayout />}>            ← persistent Header + Footer + <Outlet/>
      <Route path="/courier/tugas"  element={<TugasPage />} />
      <Route path="/courier/verifikasi" element={<VerifikasiPage />} />
      <Route path="/courier/bukti-foto" element={<BuktiFotoPage />} />
      <Route path="/courier/sukses" element={<SuksesPage />} />
      <Route path="/shipments"      element={<ShipmentListPage />} />
      <Route path="/shipments/:id"  element={<ShipmentDetailPage />} />
      <Route path="*"               element={<NotFoundPage />} />
    </Route>
    <Route path="/admin" element={<AdminLayout />}> … </Route>
  </Routes>
</BrowserRouter>
```

### Persistent Layout (`src/components/layout/MainLayout.tsx`)

`MainLayout` adalah *layout route* tanpa `path` yang merender Header (brand,
judul halaman, tombol kembali, avatar) dan Footer (bottom nav via `NavLink`)
**sekali**, lalu menampilkan halaman aktif lewat `<Outlet/>`. Karena Header dan
Footer tidak berada di dalam komponen halaman, keduanya tidak ikut ter-*remount*
saat navigasi. Rute `/courier/bukti-foto` adalah pengecualian: `MainLayout`
melewatkan chrome agar tampilan kamera tetap fullscreen.

### Dynamic Route Parameters

`ShipmentDetailPage` mengekstrak `:id` dengan `useParams`, lalu mencarinya di
`ShipmentContext` (`getShipmentById`) — bukan lagi prop drilling:

```tsx
const { id = "" } = useParams<{ id: string }>();
const { getShipmentById } = useShipmentContext();
const shipment = getShipmentById(id);

if (!shipment) return <NotifikasiResiTidakDitemukan />;  // tidak crash
```

Bila nomor resi tidak terdaftar (mis. mengetik `/shipments/XXX` langsung di
address bar), halaman menampilkan state **"Resi tidak ditemukan"** beserta tautan
kembali ke `/shipments`; URL yang tidak dikenali sama sekali diarahkan ke
`NotFoundPage` (404).

### Navigasi Programmatic

`useNavigate` dipakai setelah aksi pengguna:

- `ShipmentListPage` / `NotFoundPage` — submit form "Lacak" → `navigate("/shipments/" + id)`.
- `TugasPage` — "Pindai Resi Manual" → membuka detail resi secara otomatis.

### Commit modular

| Commit | Isi |
|---|---|
| `feat(context)` | centralize shipments + `getShipmentById` |
| `feat(shipments)` | halaman daftar resi mobile (`Link`) |
| `feat(shipments)` | halaman detail dinamis (`useParams`) + state tidak ditemukan |
| `refactor(layout)` | `MainLayout` + `CourierBottomNav` berbasis `NavLink` |
| `refactor(courier)` | seluruh layar kurir memakai shell persisten |
| `docs(readme)` | bagian ini |

## Stack

- **Runtime/build:** Bun + Vite
- **UI:** React 19 + React Router
- **Peta:** Leaflet via react-leaflet (tile OpenStreetMap)
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
