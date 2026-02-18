import { describe, expect, it } from "vitest";
import { getPostAuthRoute, getSuperAdminEmail, isSuperAdminEmail } from "@/lib/superadmin";

describe("superadmin helpers", () => {
  it("uses default superadmin email when no env value exists", () => {
    expect(getSuperAdminEmail(undefined)).toBe("afiliadosprobusiness@gmail.com");
  });

  it("normalizes configured email", () => {
    expect(getSuperAdminEmail("  ADMIN@Company.com ")).toBe("admin@company.com");
  });

  it("validates email in case-insensitive mode", () => {
    expect(isSuperAdminEmail("Owner@Site.com", "owner@site.com")).toBe(true);
    expect(isSuperAdminEmail("user@site.com", "owner@site.com")).toBe(false);
    expect(isSuperAdminEmail(null, "owner@site.com")).toBe(false);
  });

  it("returns superadmin route for allowlisted email", () => {
    expect(getPostAuthRoute("afiliadosprobusiness@gmail.com")).toBe("/superadmin");
    expect(getPostAuthRoute("user@site.com")).toBe("/dashboard");
  });
});
