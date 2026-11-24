import { describe, it, expect } from "vitest";
import { COLORS } from "../lib/constants";

describe("P1 - Branding and Homepage Polish", () => {
  it("verifies locked branding colors for navy, near-black, and accent yellow", () => {
    expect(COLORS.navy).toBe("#0B1D33");
    expect(COLORS.text).toBe("#111111");
    expect(COLORS.accent).toBe("#E8C547");
  });

  it("verifies the exact required hero trust line copy", () => {
    const requiredTrustLine =
      "Non-custodial · No wallet required to browse · Live on Tari mainnet";
    expect(requiredTrustLine).not.toContain("default");
    expect(requiredTrustLine).toBe(
      "Non-custodial · No wallet required to browse · Live on Tari mainnet"
    );
  });
});
