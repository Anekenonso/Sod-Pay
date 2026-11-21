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

  it("returns client when isDemo is false", () => {
    const client = getTariSodClient(false);
    expect(client).toBeDefined();
    expect(typeof client.createSod).toBe("function");
  });
});
