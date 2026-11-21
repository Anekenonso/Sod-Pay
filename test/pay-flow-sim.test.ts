import { describe, it, expect } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("Pay flow simulation (T-13, R-03)", () => {
  it("transitions status to Paid upon successful deposit in sim", async () => {
    const client = new SimTariSodClient();
    const creator = "tari_creator_111";
    const payer = "tari_payer_222";

    // 1. Create Sod
    const { sod: createdSod } = await client.createSod(
      { amount: "150", description: "Milestone 1 Payment" },
      creator
    );
    expect(createdSod.status).toBe("Created");
    expect(createdSod.isRevealed).toBe(false);

    // 2. Pay Sod
    const { sod: paidSod, txId } = await client.paySod(createdSod.id, "150", payer);

    // Assert done-when: status Paid in sim
    expect(paidSod.status).toBe("Paid");
    expect(paidSod.isRevealed).toBe(false);
    expect(paidSod.paidAmount).toBe("150");
    expect(paidSod.paidAt).toBeDefined();
    expect(txId).toBeDefined();

    // 3. Verify getSod reflects Paid status
    const fetchedSod = await client.getSod(createdSod.id);
    expect(fetchedSod).not.toBeNull();
    expect(fetchedSod!.status).toBe("Paid");
    expect(fetchedSod!.isRevealed).toBe(false);
  });
});
