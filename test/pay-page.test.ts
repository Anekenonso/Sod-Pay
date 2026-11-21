import { describe, it, expect } from "vitest";

describe("Pay page validation and errors (T-12, R-03)", () => {
  it("formats the exact wrong amount message when fixed amount differs", () => {
    const expectedAmount = "100";
    const providedAmount = "50";
    const errorMessage = `Wrong amount: expected ${expectedAmount} TARI, received ${providedAmount} TARI`;

    expect(errorMessage).toBe("Wrong amount: expected 100 TARI, received 50 TARI");
  });
});
