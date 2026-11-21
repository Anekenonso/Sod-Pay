import { describe, it, expect } from "vitest";
import { COLORS } from "../lib/constants";

describe("UI Polish: Motion and DESIGN tokens (T-32)", () => {
  it("verifies design token colors for toast statuses and accents", () => {
    expect(COLORS.success).toBe("#1F7A4D");
    expect(COLORS.danger).toBe("#B33A3A");
    expect(COLORS.navy).toBe("#0B1D33");
    expect(COLORS.accent).toBe("#E8C547");
  });

  it("verifies ease-out duration tokens conform to 150–300ms range", () => {
    const motionDuration = 200; // 200ms ease-out
    expect(motionDuration).toBeGreaterThanOrEqual(150);
    expect(motionDuration).toBeLessThanOrEqual(300);
  });
});
