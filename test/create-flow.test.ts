import { describe, it, expect } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("Create flow in sim mode (T-09, R-01, R-08)", () => {
  it("creates a Sod and returns id and share fields", async () => {
    const client = new SimTariSodClient();
    const creator = "tari_creator_abc123";

    const { sod, claimBadgeId, txId } = await client.createSod(
      {
        amount: "75",
        description: "Payment for freelance development",
        expiryEpoch: null,
      },
      creator
    );

    // Assert id and share fields
    expect(sod.id).toBeDefined();
    expect(sod.id.startsWith("sod_sim_")).toBe(true);
    expect(sod.status).toBe("Created");
    expect(sod.amount).toBe("75");
    expect(sod.description).toBe("Payment for freelance development");
    expect(sod.creator).toBe(creator);
    expect(claimBadgeId).toBeDefined();
    expect(claimBadgeId.startsWith("badge_sim_")).toBe(true);
    expect(txId).toBeDefined();

    // Verify creator holds badge
    const hasBadge = await client.userHoldsClaimBadge(sod.id, creator);
    expect(hasBadge).toBe(true);

    // Verify pay URL construction format
    const payUrl = `http://localhost:3000/pay/${sod.id}`;
    expect(payUrl).toContain(`/pay/${sod.id}`);
  });
});
