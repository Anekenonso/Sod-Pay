import { describe, it, expect, beforeEach } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("SimTariSodClient (T-06)", () => {
  let client: SimTariSodClient;
  const creator = "tari_creator_111";
  const payer = "tari_payer_222";
  const stranger = "tari_stranger_333";

  beforeEach(() => {
    client = new SimTariSodClient();
  });

  it("completes full lifecycle: create -> pay -> claim -> reveal", async () => {
    // 1. Create Sod
    const { sod, claimBadgeId, txId } = await client.createSod(
      { amount: "50", description: "Design work" },
      creator
    );

    expect(sod.id).toBeDefined();
    expect(sod.status).toBe("Created");
    expect(sod.creator).toBe(creator);
    expect(claimBadgeId).toBeDefined();
    expect(txId).toBeDefined();

    // Verify creator holds claim badge
    const creatorHasBadge = await client.userHoldsClaimBadge(sod.id, creator);
    expect(creatorHasBadge).toBe(true);
    const strangerHasBadge = await client.userHoldsClaimBadge(sod.id, stranger);
    expect(strangerHasBadge).toBe(false);

    // 2. Pay Sod
    const { sod: paidSod, txId: payTx } = await client.paySod(sod.id, "50", payer);
    expect(paidSod.status).toBe("Paid");
    expect(paidSod.paidAmount).toBe("50");
    expect(paidSod.isRevealed).toBe(false);
    expect(payTx).toBeDefined();

    // 3. Claim Sod
    // Stranger tries to claim -> should fail
    await expect(client.claimSod(sod.id, stranger)).rejects.toThrow(
      "Only claim badge holder can unlock funds"
    );

    // Creator claims with badge -> succeeds
    const { sod: claimedSod, txId: claimTx } = await client.claimSod(sod.id, creator);
    expect(claimedSod.status).toBe("Claimed");
    expect(claimedSod.claimedAt).toBeDefined();
    expect(claimTx).toBeDefined();

    // 4. Mutual Reveal
    // Stranger cannot request reveal
    await expect(client.requestReveal(sod.id, stranger)).rejects.toThrow(
      "Unauthorized"
    );

    // Payer requests reveal
    const { sod: reqSod } = await client.requestReveal(sod.id, payer);
    expect(reqSod.revealRequestedBy).toBe(payer);

    // Payer cannot approve own reveal request (B-03)
    await expect(client.approveReveal(sod.id, payer)).rejects.toThrow(
      "Cannot approve own reveal request; mutual consent required"
    );

    // Creator approves reveal
    const { sod: revealedSod } = await client.approveReveal(sod.id, creator);
    expect(revealedSod.status).toBe("Revealed");
    expect(revealedSod.isRevealed).toBe(true);
    expect(revealedSod.revealedAt).toBeDefined();
  });

  it("handles open amount payments", async () => {
    const { sod } = await client.createSod(
      { amount: null, description: "Donation" },
      creator
    );
    expect(sod.amount).toBeNull();

    const { sod: paidSod } = await client.paySod(sod.id, "123.45", payer);
    expect(paidSod.status).toBe("Paid");
    expect(paidSod.paidAmount).toBe("123.45");
  });

  it("rejects payment with wrong fixed amount", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Fixed gig" },
      creator
    );

    await expect(client.paySod(sod.id, "50", payer)).rejects.toThrow(
      "Wrong amount: expected 100 TARI, received 50 TARI"
    );
  });

  it("prevents double payment (B-01)", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Fixed gig" },
      creator
    );

    await client.paySod(sod.id, "100", payer);
    await expect(client.paySod(sod.id, "100", payer)).rejects.toThrow(
      "Cannot pay: status is Paid"
    );
  });

  it("allows cancel only from Created by creator (TS-05, B-04)", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Test cancel" },
      creator
    );

    // Stranger cannot cancel
    await expect(client.cancelSod(sod.id, stranger)).rejects.toThrow("Only creator can cancel");

    // Creator cancels
    const { sod: cancelledSod } = await client.cancelSod(sod.id, creator);
    expect(cancelledSod.status).toBe("Cancelled");

    // Cannot pay cancelled sod
    await expect(client.paySod(sod.id, "100", payer)).rejects.toThrow("Cannot pay");
  });

  it("prevents cancel once paid (B-04)", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Cannot cancel after pay" },
      creator
    );

    await client.paySod(sod.id, "100", payer);
    await expect(client.cancelSod(sod.id, creator)).rejects.toThrow(
      "Cannot cancel: Sod status is Paid"
    );
  });

  it("lists sods by creator", async () => {
    await client.createSod({ description: "Sod 1" }, creator);
    await client.createSod({ description: "Sod 2" }, creator);
    await client.createSod({ description: "Sod 3" }, stranger);

    const creatorList = await client.listSodsByCreator(creator);
    expect(creatorList.length).toBe(2);

    const strangerList = await client.listSodsByCreator(stranger);
    expect(strangerList.length).toBe(1);
  });
});
