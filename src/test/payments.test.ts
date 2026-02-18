import { describe, expect, it } from "vitest";
import { getPayPalPlanUrl } from "@/lib/payments";

describe("getPayPalPlanUrl", () => {
  it("returns null when plan URL is missing", () => {
    expect(getPayPalPlanUrl("starter", {})).toBeNull();
  });

  it("returns null for non-https URLs", () => {
    expect(getPayPalPlanUrl("starter", { VITE_PAYPAL_STARTER_URL: "http://paypal.test/checkout" })).toBeNull();
  });

  it("returns sanitized https URL", () => {
    const value = getPayPalPlanUrl("pro", { VITE_PAYPAL_PRO_URL: "https://www.paypal.com/checkoutnow?token=abc" });
    expect(value).toBe("https://www.paypal.com/checkoutnow?token=abc");
  });
});
