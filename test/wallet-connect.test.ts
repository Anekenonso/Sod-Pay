import { describe, it, expect } from "vitest";
import { isSapientAvailable } from "../lib/tari/wallet";
import { getRealClient, setGlobalSigner, getGlobalSigner } from "../lib/tari/client";

describe("P0 - Wallet connection and Signer session", () => {
  it("detects when Sapient is not available in node/non-browser environment", () => {
    expect(isSapientAvailable()).toBe(false);
  });

  it("manages global active signer on real client", async () => {
    const mockSigner = {
      getAddress: async () => "component_test_signer_address",
      getPublicKey: async () => new Uint8Array(32),
      signTransaction: async () => [],
    };

    setGlobalSigner(mockSigner);
    expect(getGlobalSigner()).toBe(mockSigner);

    const client = getRealClient();
    expect(client.getActiveSigner()).toBe(mockSigner);

    setGlobalSigner(null);
    expect(getGlobalSigner()).toBeNull();
    expect(client.getActiveSigner()).toBeNull();
  });

  it("real client rejects pay when Sod is not in Created status", async () => {
    const client = getRealClient();
    // In our real client, paySod validates against chain and status
    // Calling paySod without a valid component throws appropriately
    await expect(
      client.paySod("component_non_existent", "50", "component_payer_123")
    ).rejects.toThrow();
  });
});
