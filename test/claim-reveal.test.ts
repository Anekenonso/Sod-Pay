import { describe, it, expect, beforeEach } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("Claim and mutual reveal actions (T-14, R-04, R-05)", () => {
  let client: SimTariSodClient;
  const creator = "tari_creator_111";
  const payer = "tari_payer_222";
  const attacker = "tari_attacker_666";

  beforeEach(() => {
    client = new SimTariSodClient();
  });

  it("enforces that only claim badge holder can claim funds (R-04, B-02)", async () => {
    const { sod } = await client.createSod(
      { amount: "250", description: "Audit fee" },
      creator
    );

    await client.paySod(sod.id, "250", payer);

    // Attacker without claim badge tries to claim
    await expect(client.claimSod(sod.id, attacker)).rejects.toThrow(
      "Only claim badge holder can unlock funds"
    );

    // Payer without claim badge tries to claim
    await expect(client.claimSod(sod.id, payer)).rejects.toThrow(
      "Only claim badge holder can unlock funds"
    );

    // Creator with claim badge claims
    const { sod: claimedSod } = await client.claimSod(sod.id, creator);
    expect(claimedSod.status).toBe("Claimed");
  });

  it("enforces mutual reveal: single party alone cannot reveal (R-05, B-03)", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Consulting" },
      creator
    );

    await client.paySod(sod.id, "100", payer);

    // 1. Amount is hidden initially
    let currentSod = (await client.getSod(sod.id))!;
    expect(currentSod.isRevealed).toBe(false);

    // 2. Creator requests reveal
    await client.requestReveal(sod.id, creator);
    currentSod = (await client.getSod(sod.id))!;
    expect(currentSod.revealRequestedBy).toBe(creator);
    expect(currentSod.isRevealed).toBe(false); // Still NOT revealed

    // 3. Creator tries to approve their own reveal request (B-03)
    await expect(client.approveReveal(sod.id, creator)).rejects.toThrow(
      "Cannot approve own reveal request; mutual consent required (R-05)"
    );

    // Still NOT revealed
    currentSod = (await client.getSod(sod.id))!;
    expect(currentSod.isRevealed).toBe(false);

    // 4. Payer (second distinct party) approves reveal
    const { sod: revealedSod } = await client.approveReveal(sod.id, payer);
    expect(revealedSod.isRevealed).toBe(true);
    expect(revealedSod.status).toBe("Revealed");
    expect(revealedSod.paidAmount).toBe("100");
  });
});
