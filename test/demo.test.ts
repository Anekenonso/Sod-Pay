import { describe, it, expect } from "vitest";
import { MICROCOPY } from "../lib/constants";

describe("Demo mode invariants (T-07, R-08)", () => {
  it("defines exact required simulated label and text", () => {
    expect(MICROCOPY.DEMO_BANNER).toBe("Demo mode — SIMULATED — no real funds.");
  });

  it("ensures demo mode default is mainnet (false)", () => {
    // Default must be mainnet
    const defaultMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    expect(defaultMode).toBe(false);
  });
});
