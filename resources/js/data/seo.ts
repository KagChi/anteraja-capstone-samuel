import type { SeoConfig } from "../types";

export const SEO: Record<string, SeoConfig> = {
  "/": {
    title: "Satria Rapid Field Dispatch — Purwarupa Anteraja Instant",
    description:
      "Purwarupa antarmuka Anteraja Instant: aplikasi kurir Satria (mobile) dan konsol Admin/Hub (desktop) untuk integritas pengiriman berbasis geolokasi.",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://anteraja.id/#organization",
          name: "Anteraja",
          url: "https://anteraja.id",
          slogan: "Pasti Tepat",
          brand: { "@type": "Brand", name: "Anteraja Instant" },
        },
        {
          "@type": "WebSite",
          "@id": "https://anteraja.id/#website",
          name: "Satria Rapid Field Dispatch",
          inLanguage: "id",
          publisher: { "@id": "https://anteraja.id/#organization" },
          description:
            "Purwarupa antarmuka modul Anteraja Instant Delivery Integrity.",
        },
        {
          "@type": "ItemList",
          name: "Peta halaman purwarupa",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Aplikasi Kurir",
              url: "/courier/tugas",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Konsol Admin/Hub",
              url: "/admin/dashboard",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Detail Audit Trail",
              url: "/admin/audit-trail",
            },
          ],
        },
      ],
    },
  },
  "/shipments": {
    title: "Lacak Resi Pengiriman — Anteraja Instant",
    description:
      "Daftar dan pelacakan resi Anteraja Instant: cari nomor resi untuk melihat status, kurir, alamat tujuan, dan riwayat perjalanan.",
  },
  "/404": {
    title: "Halaman tidak ditemukan — Anteraja Instant",
    description:
      "Halaman yang Anda tuju tidak tersedia. Kembali ke beranda atau lacak nomor resi Anteraja Instant dari halaman ini.",
  },
  "/courier/tugas": {
    title: "Daftar Tugas Pengiriman — Satria | Anteraja Instant",
    description:
      "Daftar tugas pengiriman kurir Satria: stop aktif, jarak, estimasi, badge Instant/Same-Day, dan penanda wajib PIN.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Tugas pengiriman kurir Satria #4821",
      description:
        "Daftar stop aktif yang ditugaskan kepada kurir Satria di wilayah Jakarta Selatan.",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: 3,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000011",
            deliveryStatus: "OutForDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            deliveryAddress: {
              "@type": "PostalAddress",
              streetAddress: "Jl. Senopati No. 42",
              addressLocality: "Kebayoran Baru",
              addressRegion: "DKI Jakarta",
              addressCountry: "ID",
            },
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-SAME-771920412",
            deliveryStatus: "OutForDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            deliveryAddress: {
              "@type": "PostalAddress",
              streetAddress: "Pacific Place Tower 2 Lt. 14",
              addressLocality: "SCBD",
              addressRegion: "DKI Jakarta",
              addressCountry: "ID",
            },
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-SAME-554109823",
            deliveryStatus: "OutForDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            deliveryAddress: {
              "@type": "PostalAddress",
              streetAddress: "Jl. Gunawarman No. 18",
              addressLocality: "Kebayoran Baru",
              addressRegion: "DKI Jakarta",
              addressCountry: "ID",
            },
          },
        },
      ],
    },
  },
  "/courier/verifikasi": {
    title: "Verifikasi Lokasi & PIN — Satria | Anteraja Instant",
    description:
      "Verifikasi lokasi geofence dan PIN otorisasi penerima sebelum pengiriman Anteraja Instant diselesaikan.",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ParcelDelivery",
          trackingNumber: "AJ2509000011",
          deliveryStatus: "AttemptingDelivery",
          provider: { "@type": "Organization", name: "Anteraja" },
          deliveryAddress: {
            "@type": "PostalAddress",
            streetAddress: "Jl. Senopati No. 42",
            addressLocality: "Kebayoran Baru",
            addressRegion: "DKI Jakarta",
            addressCountry: "ID",
          },
          hasDeliveryMethod:
            "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
        },
        {
          "@type": "Place",
          name: "Titik tujuan AJ2509000011",
          geo: {
            "@type": "GeoCoordinates",
            latitude: -6.2401,
            longitude: 106.8093,
          },
          additionalProperty: [
            { "@type": "PropertyValue", name: "geofence_radius_m", value: 30 },
            {
              "@type": "PropertyValue",
              name: "distance_to_destination_m",
              value: 28,
            },
            {
              "@type": "PropertyValue",
              name: "geofence_decision",
              value: "inside",
            },
          ],
        },
        {
          "@type": "DeliveryEvent",
          name: "Verifikasi PIN otorisasi penerima",
          startDate: "2024-09-22T14:30:00+07:00",
          actionStatus: "https://schema.org/PotentialActionStatus",
          object: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000011",
          },
        },
      ],
    },
  },
  "/courier/bukti-foto": {
    title: "Ambil Bukti Foto (POD) — Satria | Anteraja Instant",
    description:
      "Kamera dalam aplikasi untuk Proof of Delivery ber-watermark koordinat, alamat, penerima, dan waktu server.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      name: "Foto bukti serah terima AJ2509000011",
      description:
        "Proof of Delivery ber-watermark: koordinat, alamat, nama penerima, dan stempel waktu server untuk pengiriman Anteraja Instant.",
      dateCreated: "2024-09-22T15:14:00+07:00",
      encodingFormat: "image/jpeg",
      creator: {
        "@type": "Person",
        name: "Ahmad Satria",
        jobTitle: "Kurir Anteraja",
      },
      contentLocation: {
        "@type": "Place",
        name: "Senopati, Jakarta Selatan",
        geo: {
          "@type": "GeoCoordinates",
          latitude: -6.2401,
          longitude: 106.8093,
        },
      },
      about: {
        "@type": "ParcelDelivery",
        trackingNumber: "AJ2509000011",
        deliveryStatus: "Completed",
        provider: { "@type": "Organization", name: "Anteraja" },
        recipient: { "@type": "Person", name: "Bambang Wijaya" },
      },
    },
  },
  "/courier/sukses": {
    title: "Konfirmasi Sukses — Satria | Anteraja Instant",
    description:
      "Konfirmasi pengiriman tuntas dengan ringkasan integritas audit: geofence, PIN, stempel waktu NTP, dan kode hash audit.",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ParcelDelivery",
          trackingNumber: "AJ2509000011",
          deliveryStatus: "Completed",
          deliveryTime: "2024-09-22T15:14:28+07:00",
          provider: { "@type": "Organization", name: "Anteraja" },
          recipient: { "@type": "Person", name: "Bambang Wijaya" },
          deliveryAddress: {
            "@type": "PostalAddress",
            streetAddress: "Jl. Senopati No. 42",
            addressLocality: "Kebayoran Baru",
            addressRegion: "DKI Jakarta",
            addressCountry: "ID",
          },
        },
        {
          "@type": "DeliveryEvent",
          name: "Pengiriman tuntas AJ2509000011",
          startDate: "2024-09-22T14:32:00+07:00",
          endDate: "2024-09-22T14:32:00+07:00",
          actionStatus: "https://schema.org/CompletedActionStatus",
          additionalProperty: [
            { "@type": "PropertyValue", name: "geofence_radius_m", value: 30 },
            {
              "@type": "PropertyValue",
              name: "distance_to_destination_m",
              value: 28,
            },
            { "@type": "PropertyValue", name: "pin_verified", value: true },
            {
              "@type": "PropertyValue",
              name: "audit_hash",
              value: "AUD-SEC-9912-SHA256",
            },
          ],
        },
      ],
    },
  },
  "/admin/dashboard": {
    title: "Dashboard Pengiriman — Admin Hub | Anteraja Instant",
    description:
      "Konsol Admin/Hub: pantau status integritas pengiriman kurir Satria hari ini, filter perlu tinjauan, dan buka audit trail.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Daftar pengiriman hari ini — Hub Jakarta Selatan",
      description:
        "Pantauan status integritas pengiriman kurir Satria; 4 pengiriman perlu tinjauan.",
      numberOfItems: 6,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000012",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000004",
            deliveryStatus: "Completed",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-SAME-771920412",
            deliveryStatus: "Completed",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
        {
          "@type": "ListItem",
          position: 4,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000005",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
        {
          "@type": "ListItem",
          position: 5,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-REG-554109823",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
        {
          "@type": "ListItem",
          position: 6,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-SAME-220193",
            deliveryStatus: "Completed",
            provider: { "@type": "Organization", name: "Anteraja" },
          },
        },
      ],
    },
  },
  "/admin/audit-trail": {
    title: "Detail Audit Trail — AJ2509000004 | Admin Hub Anteraja",
    description:
      "Jejak audit lengkap satu pengiriman Anteraja Instant: validasi geofence, POD ber-watermark, riwayat PIN, kronologi event, dan putusan admin.",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ParcelDelivery",
          trackingNumber: "AJ2509000004",
          deliveryStatus: "Completed",
          provider: {
            "@type": "Organization",
            name: "Anteraja",
            url: "https://anteraja.id",
            brand: { "@type": "Brand", name: "Anteraja Instant" },
          },
          itemShipped: { "@type": "Product", name: "Paket Anteraja Instant" },
          originAddress: {
            "@type": "PostalAddress",
            name: "Hub Jakarta Selatan",
            addressLocality: "Jakarta Selatan",
            addressRegion: "DKI Jakarta",
            addressCountry: "ID",
          },
          deliveryAddress: {
            "@type": "PostalAddress",
            streetAddress: "Jl. Senopati No. 42",
            addressLocality: "Kebayoran Baru",
            addressRegion: "DKI Jakarta",
            addressCountry: "ID",
          },
          deliveryTime: "2024-09-22T15:14:28+07:00",
          hasDeliveryMethod:
            "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
          partOfOrder: {
            "@type": "Order",
            orderNumber: "AJ2509000004",
            customer: { "@type": "Person", name: "Bambang Wijaya" },
          },
        },
        {
          "@type": "DeliveryEvent",
          name: "Pengiriman tuntas dengan toleransi jarak",
          startDate: "2024-09-22T14:32:00+07:00",
          actionStatus: "https://schema.org/CompletedActionStatus",
          object: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000004",
          },
          additionalProperty: [
            { "@type": "PropertyValue", name: "geofence_radius_m", value: 30 },
            {
              "@type": "PropertyValue",
              name: "distance_to_destination_m",
              value: 12,
            },
            { "@type": "PropertyValue", name: "pin_status", value: "verified" },
          ],
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Daftar Pengiriman",
              item: "dashboard.html",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Detail Audit Trail AJ2509000004",
            },
          ],
        },
      ],
    },
  },
  "/admin/antrian-pengecualian": {
    title: "Antrian Pengecualian Geofence — Admin Hub | Anteraja Instant",
    description:
      "Antrian persetujuan dispensasi lokasi kurir di luar radius geofence resmi, dengan deviasi, alasan, dan aksi tinjau.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Antrian pengecualian geofence",
      description:
        "Pengajuan dispensasi lokasi kurir di luar radius resmi yang menunggu keputusan Admin/CS.",
      numberOfItems: 4,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000005",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "deviation_m", value: 64 },
              {
                "@type": "PropertyValue",
                name: "reason",
                value: "Gate cluster menutup, akses lewat pos satpam.",
              },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "AJ2509000012",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "deviation_m", value: 55 },
              {
                "@type": "PropertyValue",
                name: "reason",
                value: "Jalan satu arah, harus putar balik ke lobi.",
              },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-SAME-771920412",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "deviation_m", value: 41 },
              {
                "@type": "PropertyValue",
                name: "reason",
                value: "Drop-off di gerbang tower, satpam tidak izinkan masuk.",
              },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 4,
          item: {
            "@type": "ParcelDelivery",
            trackingNumber: "ANT-REG-554109823",
            deliveryStatus: "AttemptingDelivery",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              { "@type": "PropertyValue", name: "deviation_m", value: 118 },
              {
                "@type": "PropertyValue",
                name: "reason",
                value: "Penerima minta titip di pos lingkungan.",
              },
            ],
          },
        },
      ],
    },
  },
  "/admin/pengaturan-radius": {
    title: "Pengaturan Radius Layanan — Admin Hub | Anteraja Instant",
    description:
      "Kebijakan geofence sistem: atur batas toleransi jarak GPS kurir per segmen layanan Instant, Same-Day, Reguler, dan Kargo.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Kebijakan radius geofence per segmen layanan",
      description:
        "Fleet Safety Protocol v4.2 — batas toleransi jarak GPS kurir untuk validasi serah terima.",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Service",
            name: "Anteraja Instant",
            serviceType: "instant",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "geofence_radius_m",
                value: 30,
              },
              { "@type": "PropertyValue", name: "sla", value: "2-3 Jam" },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "Service",
            name: "Anteraja Same-Day",
            serviceType: "same_day",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "geofence_radius_m",
                value: 50,
              },
              { "@type": "PropertyValue", name: "sla", value: "6-8 Jam" },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "Service",
            name: "Anteraja Reguler",
            serviceType: "regular",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "geofence_radius_m",
                value: 100,
              },
              { "@type": "PropertyValue", name: "sla", value: "1-2 Hari" },
            ],
          },
        },
        {
          "@type": "ListItem",
          position: 4,
          item: {
            "@type": "Service",
            name: "Anteraja Kargo",
            serviceType: "kargo",
            provider: { "@type": "Organization", name: "Anteraja" },
            additionalProperty: [
              {
                "@type": "PropertyValue",
                name: "geofence_radius_m",
                value: 150,
              },
              { "@type": "PropertyValue", name: "sla", value: "Bulk" },
            ],
          },
        },
      ],
    },
  },
};
