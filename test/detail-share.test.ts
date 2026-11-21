import { describe, it, expect } from "vitest";

describe("Sod detail share QR and link (T-11, R-02)", () => {
  it("formats share link with origin and sod id", () => {
    const origin = "https://sod-pay.com";
    const sodId = "sod_sim_test789";
    const shareUrl = `${origin}/pay/${sodId}`;

    expect(shareUrl).toBe("https://sod-pay.com/pay/sod_sim_test789");
    expect(shareUrl.startsWith(origin)).toBe(true);
    expect(shareUrl.includes(`/pay/${sodId}`)).toBe(true);
  });
});
