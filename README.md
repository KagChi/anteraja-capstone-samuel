# Anteraja Capstone — Samuel

This capstone project focuses on geolocation-based shipping, using location data to estimate delivery routes, coverage areas, and transit times between origin and destination. The goal is to help users understand where a shipment is and how long it will take to arrive based on real geographic distance rather than static rate tables.

The project will combine shipping-rate logic with coordinate-based mapping so that distance, service type, and destination region all influence the calculated cost and estimated arrival. It is intended as a foundation that can grow into a tracking or rate-estimation feature during the bootcamp.

## Aplikasi: Anteraja Hub Dwell Monitor (Day 19)

Folder [`hub-dwell-monitor/`](hub-dwell-monitor/README.md) berisi aplikasi React + Vite + Leaflet untuk
memantau dwell time hub: KPI global, Top 3 hub, peta Leaflet interaktif, hub list yang bisa dicari,
satu filter prioritas untuk peta dan list, detail hub, serta ringkasan AI terstruktur. Metrik
diturunkan dari dataset scan event Day 18, dan desain mengacu pada hasil Stitch.

```bash
cd hub-dwell-monitor && npm install && npm run dev
```

This repository is organized with `src/` for application code and `docs/` for design notes and supporting documentation. Configuration and credentials are kept out of version control through a local `.env` file, with `.env.example` provided as a safe template. The stack is intentionally left open at this stage and will be decided as the features take shape.
