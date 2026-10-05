import { describe, expect, it } from "vitest";
import { resolveAdminCrumb } from "./adminNav";

describe("resolveAdminCrumb", () => {
  it("highlights PIN Terkunci on its own page", () => {
    expect(resolveAdminCrumb("/admin/pin-terkunci")).toEqual({
      section: "Operasional Harian",
      sectionHref: "/admin/dashboard",
      current: "PIN Terkunci",
      activeNav: "/admin/pin-terkunci",
    });
  });

  it("highlights Pengaturan Radius on its own page", () => {
    expect(resolveAdminCrumb("/admin/pengaturan-radius").activeNav).toBe(
      "/admin/pengaturan-radius",
    );
  });

  it("keeps the audit trail under the dashboard nav item", () => {
    expect(resolveAdminCrumb("/admin/audit-trail")).toMatchObject({
      current: "Detail Audit Trail",
      activeNav: "/admin/dashboard",
    });
  });

  it("keeps a nested PIN route under PIN Terkunci", () => {
    expect(resolveAdminCrumb("/admin/pin-terkunci/abc-123").activeNav).toBe(
      "/admin/pin-terkunci",
    );
  });

  it("falls back to the dashboard crumb for unknown admin paths", () => {
    expect(resolveAdminCrumb("/admin/entah-apa").activeNav).toBe(
      "/admin/dashboard",
    );
  });
});
