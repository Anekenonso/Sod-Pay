import { describe, it, expect } from "vitest";
import { ROUTES, COLORS, MICROCOPY, APP_CONFIG, FEES } from "../lib/constants";

describe("constants", () => {
  it("resolves routes correctly", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.MY_SODS).toBe("/app");
    expect(ROUTES.CREATE_SOD).toBe("/app/create");
    expect(ROUTES.SOD_DETAIL("abc")).toBe("/app/s/abc");
    expect(ROUTES.PAY_SOD("123")).toBe("/pay/123");
  });

  it("exports design tokens matching DESIGN.md", () => {
    expect(COLORS.background).toBe("#F7F7F5");
    expect(COLORS.navy).toBe("#0B1D33");
    expect(COLORS.accent).toBe("#E8C547");
  });

  it("exports locked microcopy", () => {
    expect(MICROCOPY.CTA_CREATE).toBe("Create a Sod");
    expect(MICROCOPY.SAFETY_CREATE).toContain("Only you will receive the claim badge");
    expect(MICROCOPY.PAY_PRIVATE).toContain("amount will not be visible");
  });

  it("exports fee constants raised above 2000 for mainnet WASM metering", () => {
    expect(Number(FEES.CREATE_MAX_FEE)).toBeGreaterThanOrEqual(100000);
    expect(Number(FEES.PAY_MAX_FEE)).toBeGreaterThanOrEqual(50000);
    expect(Number(FEES.CLAIM_MAX_FEE)).toBeGreaterThanOrEqual(50000);
  });
});
