import { describe, it, expect } from "vitest";
import { createInitialWalletSession, getTariSodClient } from "../lib/tari/client";

describe("Wallet session and client factory (T-16, R-07)", () => {
  it("initializes wallet session disconnected by default (connect only on action)", () => {
    const session = createInitialWalletSession();
    expect(session.isConnected).toBe(false);
    expect(session.address).toBeNull();
    expect(session.network).toBe("mainnet");
  });

  it("returns simulated client when isDemo is true", () => {
    const client = getTariSodClient(true);
    expect(client.mode).toBe("SIMULATED");
  });

  it("returns real on-chain client when isDemo is false (R-07, T-19)", () => {
    const client = getTariSodClient(false);
    expect(client).toBeDefined();
    expect(client.mode).toBe("REAL");
    expect(typeof client.createSod).toBe("function");
    expect(typeof client.paySod).toBe("function");
    expect(typeof client.claimSod).toBe("function");
    expect(typeof client.cancelSod).toBe("function");
    expect(typeof client.requestReveal).toBe("function");
    expect(typeof client.approveReveal).toBe("function");
    expect(typeof client.getSod).toBe("function");
    expect(typeof client.listSodsByCreator).toBe("function");
    expect(typeof client.userHoldsClaimBadge).toBe("function");
  });

  it("listSodsByCreator returns an array on real client (T-31)", async () => {
    const client = getTariSodClient(false);
    const list = await client.listSodsByCreator("addr_alice");
    expect(Array.isArray(list)).toBe(true);
  });

  it("userHoldsClaimBadge returns false for unknown address (T-31)", async () => {
    const client = getTariSodClient(false);
    const holds = await client.userHoldsClaimBadge("sod_unknown", "addr_bob");
    expect(holds).toBe(false);
  });
});
