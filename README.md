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
