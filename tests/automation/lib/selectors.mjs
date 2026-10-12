/**
 * The DOM contract the Puppeteer suite drives. The courier PWA already ships
 * stable ids and data attributes for automation, so a UI rename stays a
 * one-line fix here instead of a hunt through the scripts.
 */
export const sel = {
  login: {
    email: "#email",
    password: "#password",
    submit: 'button[type="submit"]',
  },

  tasks: {
    container: "#task-container",
    card: (tracking) => `article[data-tracking="${tracking}"]`,
    openLink: (tracking) =>
      `article[data-tracking="${tracking}"] a[href^="/courier/verifikasi"]`,
  },

  verification: {
    form: "#pin-form",
    pinHint: "#pin-hint",
    pinInput: (index) => `#pin-${index}`,
    attempts: "#pin-attempts",
    geofenceStatus: "#geofence-status",
    gpsWarning: "#gps-warning",
    relationTab: (relation) => `#relation-tabs [data-relation="${relation}"]`,
    nextStep: "#btn-next-step",
    lockReason: "#lock-reason",
    lockedBanner: "#pin-locked-banner",
    exceptionCard: "#exception-card",
    exceptionReason: "#exception-reason",
    exceptionSubmit: "#btn-request-exception",
  },

  proof: {
    capture: "#btn-capture-photo",
    confirm: "#btn-confirm-pod",
    retake: "#btn-retake-photo",
    watermark: "#pod-watermark",
    gpsStatus: "#pod-gps-status",
    blockedPanel: "#gps-blocked-panel",
    lockReason: "#gps-lock-reason",
    requestReview: "#btn-request-gps-review",
    lockPending: "#gps-lock-pending",
  },

  success: {
    title: "#judul-sukses",
    audit: "#audit-details",
  },

  history: {
    list: "#history-list",
    row: (tracking) => `#history-list li[data-tracking="${tracking}"]`,
    pageButton: (number) => `button[aria-label="Halaman ${number}"]`,
    pageIndicator: "#page-indicator",
  },

  /** The toast is an <output aria-live="polite"> that lives for ~3.5 s. */
  toast: 'output[aria-live="polite"]',
};
