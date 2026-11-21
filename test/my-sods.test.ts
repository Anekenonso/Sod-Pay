import { describe, it, expect } from "vitest";
import { SimTariSodClient } from "../lib/tari/sod";

describe("My Sods list functionality (T-10, R-01)", () => {
  it("returns empty list for a fresh creator", async () => {
    const client = new SimTariSodClient();
    const list = await client.listSodsByCreator("tari_fresh_user");
    expect(list).toEqual([]);
  });

  it("returns created Sods with correct status and claim badge ownership", async () => {
    const client = new SimTariSodClient();
    const creator = "tari_creator_xyz";

    const { sod } = await client.createSod(
      { amount: "200", description: "Design project" },
      creator
    );

    const list = await client.listSodsByCreator(creator);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(sod.id);
    expect(list[0].status).toBe("Created");

    const holdsBadge = await client.userHoldsClaimBadge(sod.id, creator);
    expect(holdsBadge).toBe(true);
  });
});
