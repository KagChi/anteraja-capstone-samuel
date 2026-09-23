/* Satria Rapid Field Dispatch — perilaku dasar prototype.
 *
 * CATATAN: Interaksi penuh (filter, verifikasi PIN, unggah POD, dsb.) dikerjakan
 * pada latihan berikutnya dengan JavaScript/jQuery memakai selector yang sudah
 * disiapkan tiap elemen (#tracking-input, #segment-bar, #btn-submit-pin, dst).
 * Berkas ini hanya menangani hal struktural agar halaman responsif dapat dipakai. */
(function () {
  "use strict";

  /* 1. Sidebar konsol admin: buka/tutup pada layar kecil. */
  var toggle = document.getElementById("sidebar-toggle");
  var sidebar = document.getElementById("admin-sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("translate-x-0", open);
    sidebar.classList.toggle("-translate-x-full", !open);
    if (backdrop) {
      backdrop.classList.toggle("hidden", !open);
    }
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = sidebar && sidebar.classList.contains("-translate-x-full");
      setSidebar(!!open);
    });
  }
  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setSidebar(false);
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setSidebar(false);
  });

  /* 2. Tautan stub (belum punya tujuan) tidak melompat ke atas halaman. */
  document.querySelectorAll('a[data-stub]').forEach(function (link) {
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", function (event) {
      event.preventDefault();
    });
  });
})();
