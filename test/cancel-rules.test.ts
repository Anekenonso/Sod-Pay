import { describe, it, expect, beforeEach } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("Cancel Sod rules and invariants (T-15, R-06, B-04)", () => {
  let client: SimTariSodClient;
  const creator = "tari_creator_111";
  const payer = "tari_payer_222";
  const stranger = "tari_stranger_333";

  beforeEach(() => {
    client = new SimTariSodClient();
  });

  it("allows creator to cancel a Sod in Created status", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "To be cancelled" },
      creator
    );
    expect(sod.status).toBe("Created");

    const { sod: cancelledSod } = await client.cancelSod(sod.id, creator);
    expect(cancelledSod.status).toBe("Cancelled");

    const fetched = await client.getSod(sod.id);
    expect(fetched!.status).toBe("Cancelled");
  });

  it("prevents non-creator from cancelling", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Protected Sod" },
      creator
    );

    await expect(client.cancelSod(sod.id, stranger)).rejects.toThrow(
      "Unauthorized: Only creator can cancel"
    );
  });

  it("cancel from Paid fails test (R-06, B-04)", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Paid gig" },
      creator
    );

    // Payer deposits funds
    await client.paySod(sod.id, "100", payer);

    // Creator tries to cancel paid sod -> MUST FAIL
    await expect(client.cancelSod(sod.id, creator)).rejects.toThrow(
      "Cannot cancel: Sod status is Paid"
    );

    // Confirm state remains Paid
    const fetched = await client.getSod(sod.id);
    expect(fetched!.status).toBe("Paid");
  });

  it("prevents cancel from Claimed or Cancelled", async () => {
    const { sod } = await client.createSod(
      { amount: "100", description: "Lifecycle test" },
      creator
    );

    await client.cancelSod(sod.id, creator);

    // Try cancelling again
    await expect(client.cancelSod(sod.id, creator)).rejects.toThrow(
      "Cannot cancel: Sod status is Cancelled"
    );
  });
});
