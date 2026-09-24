(function () {
  "use strict";

  var STORAGE = {
    session: "anteraja.session",
    decisions: "anteraja.decisions",
    radii: "anteraja.radii",
    completed: "anteraja.completed"
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  var storage = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        return;
      }
    },
    remove: function (key) {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        return;
      }
    }
  };

  function getSession() {
    return storage.get(STORAGE.session, null);
  }

  function setSession(session) {
    storage.set(STORAGE.session, session);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pad2(number) {
    return String(number).padStart(2, "0");
  }

  function formatClock(date) {
    var now = date || new Date();
    return pad2(now.getHours()) + ":" + pad2(now.getMinutes());
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  function formatStamp(date) {
    var now = date || new Date();
    return now.getDate() + " " + MONTHS[now.getMonth()] + " " + now.getFullYear() +
      " \u2022 " + formatClock(now) + " WIB";
  }

  function randomDigits(length) {
    var out = "";
    for (var i = 0; i < length; i += 1) {
      out += Math.floor(Math.random() * 10);
    }
    return out;
  }

  var spinnerMarkup = '<span class="app-spinner" aria-hidden="true"></span>';

  function withLoading(button, message, delay, done) {
    if (!button || button.dataset.loading === "1") return;
    button.dataset.loading = "1";
    var original = button.innerHTML;
    var wasDisabled = button.hasAttribute("disabled");
    var isButton = button.tagName === "BUTTON";
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-disabled", "true");
    button.classList.add("is-loading");
    if (isButton) button.disabled = true;
    button.innerHTML = spinnerMarkup + "<span>" + (message || "Memproses...") + "</span>";

    window.setTimeout(function () {
      button.innerHTML = original;
      button.removeAttribute("aria-busy");
      button.removeAttribute("aria-disabled");
      button.classList.remove("is-loading");
      if (isButton && !wasDisabled) button.disabled = false;
      delete button.dataset.loading;
      if (typeof done === "function") done();
    }, delay == null ? 900 : delay);
  }

  var TOAST_STYLE_ID = "app-toast-style";
  var TOAST_CSS =
    ".app-toast{position:fixed;top:calc(1rem + env(safe-area-inset-top,0px));left:50%;z-index:80;" +
    "display:flex;align-items:center;gap:.5rem;max-width:calc(100% - 2rem);padding:.65rem 1rem;" +
    "border-radius:.75rem;background:#1c1b1b;color:#fff;font-size:13px;font-weight:600;" +
    "box-shadow:0 12px 30px rgba(28,27,27,.25);opacity:0;transform:translate(-50%,-160%);" +
    "transition:transform .3s ease,opacity .3s ease;pointer-events:none}" +
    ".app-toast.is-visible{opacity:1;transform:translate(-50%,0)}" +
    ".app-toast.is-error{background:#ba1a1a}" +
    ".app-toast__icon{font-size:18px}";

  function ensureToastStyle() {
    if (document.getElementById(TOAST_STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = TOAST_STYLE_ID;
    style.textContent = TOAST_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureToast() {
    ensureToastStyle();
    var toast = $("#app-toast");
    if (toast) return toast;
    toast = document.createElement("output");
    toast.id = "app-toast";
    toast.className = "app-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML =
      '<span class="material-symbols-outlined app-toast__icon" aria-hidden="true">check_circle</span>' +
      '<span class="app-toast__text"></span>';
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(text, type) {
    var toast = ensureToast();
    var isError = type === "error";
    toast.classList.remove("is-visible", "is-error");
    if (isError) toast.classList.add("is-error");
    var icon = toast.querySelector(".app-toast__icon");
    var label = toast.querySelector(".app-toast__text");
    if (icon) icon.textContent = isError ? "error" : "check_circle";
    if (label) label.textContent = text;
    void toast.offsetWidth;
    toast.classList.add("is-visible");
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3200);
  }

  function activateTab(buttons, active, activeClasses, idleClasses) {
    buttons.forEach(function (button) {
      var isActive = button === active;
      activeClasses.forEach(function (name) {
        button.classList.toggle(name, isActive);
      });
      idleClasses.forEach(function (name) {
        button.classList.toggle(name, !isActive);
      });
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function greet(nameSelector, fallback) {
    var session = getSession();
    var name = session && session.name ? session.name : fallback;
    $$(nameSelector).forEach(function (node) {
      node.textContent = name;
    });
    return name;
  }

  function welcome(name) {
    if (!getSession()) return;
    window.setTimeout(function () {
      showToast("Halo, " + name + "! Selamat bekerja.");
    }, 350);
  }

  function getDecisions() {
    return storage.get(STORAGE.decisions, {});
  }

  function setDecision(tracking, decision, note) {
    var all = getDecisions();
    all[tracking] = { decision: decision, note: note || "", at: Date.now() };
    storage.set(STORAGE.decisions, all);
  }

  function getCompleted() {
    return storage.get(STORAGE.completed, []);
  }

  function markCompleted(tracking) {
    var list = getCompleted();
    if (list.indexOf(tracking) === -1) {
      list.push(tracking);
      storage.set(STORAGE.completed, list);
    }
    return list;
  }

  function initSidebar() {
    var toggle = $("#sidebar-toggle");
    var sidebar = $("#admin-sidebar");
    var backdrop = $("#sidebar-backdrop");

    function setSidebar(open) {
      if (!sidebar) return;
      sidebar.classList.toggle("translate-x-0", open);
      sidebar.classList.toggle("-translate-x-full", !open);
      if (backdrop) backdrop.classList.toggle("hidden", !open);
      if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
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
  }

  function initStubLinks() {
    $$("a[data-stub]").forEach(function (link) {
      link.setAttribute("aria-disabled", "true");
      link.addEventListener("click", function (event) {
        event.preventDefault();
        showToast("Fitur ini belum tersedia pada purwarupa.", "error");
      });
    });
  }

  function initIndex() {
    var modal = $("#login-modal");
    var form = $("#login-form");
    var nameInput = $("#login-name");
    var roleLabel = $("#login-role-label");
    var submit = $("#btn-login");
    if (!modal || !form) return;

    var targets = { courier: "courier/tugas.html", admin: "admin/dashboard.html" };
    var labels = { courier: "Aplikasi Kurir (Mobile)", admin: "Konsol Admin / Hub" };
    var defaults = { courier: "Satria", admin: "Hub Admin Ops" };
    var role = "courier";

    function open(selected) {
      role = targets[selected] ? selected : "courier";
      if (roleLabel) roleLabel.textContent = labels[role];
      if (nameInput) {
        nameInput.value = "";
        nameInput.placeholder = defaults[role];
      }
      if (typeof modal.showModal === "function") {
        modal.showModal();
      } else {
        modal.setAttribute("open", "open");
      }
      window.setTimeout(function () {
        if (nameInput) nameInput.focus();
      }, 60);
    }

    $$("[data-role]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        open(link.dataset.role);
      });
    });

    $$("[data-close-modal]", modal).forEach(function (button) {
      button.addEventListener("click", function () {
        modal.close();
      });
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) modal.close();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var typed = nameInput ? nameInput.value.trim() : "";
      var name = typed || defaults[role];
      setSession({ role: role, name: name, at: Date.now() });
      withLoading(submit, "Menghubungkan...", 900, function () {
        window.location.href = targets[role];
      });
    });
  }

  function initCourierTugas() {
    var name = greet("#courier-name", "Satria");
    welcome(name);

    var bar = $("#segment-bar");
    var buttons = $$(".seg-btn", bar || document);
    var cards = $$(".task-card");
    var remaining = $("#task-remaining");
    var done = $("#task-done");

    var activeClasses = ["bg-surface-container-lowest", "text-on-surface", "font-semibold", "shadow-sm"];
    var idleClasses = ["text-on-surface-variant", "font-medium", "hover:text-on-surface"];

    function baseDone() {
      return 8 + getCompleted().length;
    }

    function applyFilter(filter) {
      var visible = 0;
      cards.forEach(function (card) {
        var item = card.closest("li");
        var match = filter === "all" || card.dataset.category === filter;
        if (item) item.hidden = !match;
        if (match) visible += 1;
      });
      if (remaining) remaining.textContent = String(visible);
      if (done) done.textContent = String(baseDone());
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        activateTab(buttons, button, activeClasses, idleClasses);
        applyFilter(button.dataset.filter);
      });
    });

    applyFilter("all");

    var scan = $("#btn-scan-resi");
    if (scan) {
      scan.addEventListener("click", function () {
        var code = window.prompt("Masukkan nomor resi yang ingin dipindai:");
        if (!code) return;
        var query = code.trim().toLowerCase();
        if (!query) return;
        var found = cards.find(function (card) {
          return card.dataset.tracking.toLowerCase().indexOf(query) !== -1;
        });
        if (!found) {
          showToast("Resi tidak ditemukan: " + code.trim(), "error");
          return;
        }
        var activeButton = buttons.find(function (button) {
          return button.dataset.filter === "all";
        });
        activateTab(buttons, activeButton, activeClasses, idleClasses);
        applyFilter("all");
        var item = found.closest("li");
        if (item) {
          item.scrollIntoView({ behavior: "smooth", block: "center" });
          found.classList.remove("is-flash");
          void found.offsetWidth;
          found.classList.add("is-flash");
        }
        showToast("Resi ditemukan: " + found.dataset.tracking);
      });
    }
  }

  var PAGES = {
    index: initIndex,
    "courier-tugas": initCourierTugas
  };

  function start() {
    initSidebar();
    initStubLinks();
    var page = document.body.dataset.page;
    var init = PAGES[page];
    if (typeof init === "function") init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
