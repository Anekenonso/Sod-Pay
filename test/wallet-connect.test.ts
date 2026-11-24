import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSapientAvailable,
  isExtensionAvailable,
  getInjectedExtensions,
  connectExtension,
} from "../lib/tari/wallet";
import {
  getRealClient,
  setActiveWalletSession,
  getActiveWalletSession,
  setGlobalSigner,
  getGlobalSigner,
} from "../lib/tari/client";

describe("P0 - Wallet connection and Signer session (v3)", () => {
  beforeEach(() => {
    setActiveWalletSession(null);
  });

  afterEach(() => {
    setActiveWalletSession(null);
    vi.restoreAllMocks();
  });

  it("detects when extension is not available in node environment", () => {
    expect(isSapientAvailable()).toBe(false);
    expect(isExtensionAvailable()).toBe(false);
    expect(getInjectedExtensions()).toEqual([]);
  });

  it("detects compatible Tari extensions dynamically without hard-coding Sapient", () => {
    const mockTari = {
      name: "Tari Extension X",
      request: vi.fn().mockResolvedValue(["component_user_123"]),
    };
    const mockOotle = {
      name: "Ootle Mobile Bridge",
      request: vi.fn(),
    };

    // Temporarily inject mock into global/window
    (global as any).window = {
      tari: mockTari,
      ootle: mockOotle,
    };

    const detected = getInjectedExtensions();
    expect(detected.length).toBe(2);
    expect(detected[0].name).toBe("Tari Extension X");
    expect(detected[1].name).toBe("Ootle Mobile Bridge");

    // Clean up
    delete (global as any).window;
  });

  it("calls tari_signAndSubmitTransaction with instructions on extension session", async () => {
    const client = getRealClient();

    const mockInstructions = [
      { CallFunction: { template_address: "template_abc", function: "create" } },
    ];

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = vi.fn();
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        buildUnsignedTransaction = () => ({
          instructions: mockInstructions,
          fee_instructions: [],
          inputs: [],
          blobs: [],
        });
      },
      sendTransaction: vi.fn(),
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };
    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);

    const requestSpy = vi.fn().mockImplementation(async ({ method, params }) => {
      if (method === "tari_signAndSubmitTransaction") {
        expect(params).toBeDefined();
        expect(params.instructions).toEqual(mockInstructions);
        expect(params.maxFee).toBe("100000");
        return {
          transaction_id: "tx_mock_12345",
          result: {
            Finalized: {
              diff_summary: {
                upped: [
                  { substate_id: "component_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
                  { substate_id: "resource_fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210" },
                ],
              },
            },
          },
        };
      }
      if (method === "tari_signTransaction") {
        throw new Error("Unsupported method: tari_signTransaction");
      }
      return null;
    });

    const mockExtensionProvider = {
      name: "Sapient",
      request: requestSpy,
    };

    setActiveWalletSession({
      address: "component_alice_address",
      type: "extension",
      walletName: "Sapient",
      provider: mockExtensionProvider,
    });

    const result = await client.createSod(
      { description: "Test extension payment", amount: "100" },
      "component_alice_address"
    );

    expect(requestSpy).toHaveBeenCalled();
    expect(requestSpy.mock.calls[0][0].method).toBe("tari_signAndSubmitTransaction");
    expect(result.sod.id).toBe(
      "component_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    expect(result.claimBadgeId).toBe(
      "resource_fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
    );
  });

  it("never silently falls back to daemon when extension session is active", async () => {
    const client = getRealClient();

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = vi.fn();
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        buildUnsignedTransaction = () => ({
          instructions: [],
          fee_instructions: [],
          inputs: [],
          blobs: [],
        });
      },
      sendTransaction: vi.fn(),
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };
    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);

    const mockExtensionProvider = {
      name: "Tari Extension",
      request: vi.fn().mockRejectedValue(new Error("User rejected transaction in extension")),
    };

    setActiveWalletSession({
      address: "component_bob_address",
      type: "extension",
      walletName: "Tari Extension",
      provider: mockExtensionProvider,
    });

    await expect(
      client.createSod(
        { description: "Should fail in extension", amount: "50" },
        "component_bob_address"
      )
    ).rejects.toThrow(/Extension rejected or failed to sign and submit: User rejected transaction in extension/);
  });

  it("uses daemon signer when user explicitly selected daemon session", async () => {
    const client = getRealClient();

    const mockSendTransaction = vi.fn().mockResolvedValue({
      transaction_id: "tx_daemon_555",
      result: {
        Finalized: {
          diff_summary: {
            upped: [
              { substate_id: "component_daemon_created_comp_00000000000000000000000000000000000000" },
              { substate_id: "resource_daemon_badge_res_00000000000000000000000000000000000000" },
            ],
          },
        },
      },
    });

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = vi.fn();
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        buildUnsignedTransaction = () => ({
          instructions: [],
          fee_instructions: [],
          inputs: [],
          blobs: [],
        });
      },
      sendTransaction: mockSendTransaction,
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };
    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);
    vi.spyOn(client as any, "getProvider").mockResolvedValue({} as any);

    const mockDaemonSigner = {
      getAddress: async () => "component_daemon_address",
      getPublicKey: async () => new Uint8Array(32),
      signTransaction: vi.fn(),
    };

    setActiveWalletSession({
      address: "component_daemon_address",
      type: "daemon",
      walletName: "Wallet Daemon",
      signer: mockDaemonSigner as any,
    });

    const result = await client.createSod(
      { description: "Daemon creation", amount: "25" },
      "component_daemon_address"
    );

    expect(mockSendTransaction).toHaveBeenCalled();
    expect(result.sod.id).toBe(
      "component_daemon_created_comp_00000000000000000000000000000000000000"
    );
  });

  it("rejects signing when wallet is disconnected or manual view-only", async () => {
    const client = getRealClient();

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = vi.fn();
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        buildUnsignedTransaction = () => ({
          instructions: [],
          fee_instructions: [],
          inputs: [],
          blobs: [],
        });
      },
      sendTransaction: vi.fn(),
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };
    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);

    // 1. Disconnected
    setActiveWalletSession(null);
    await expect(
      client.createSod({ description: "No wallet", amount: "10" }, "component_anon")
    ).rejects.toThrow(/No wallet connected/);

    // 2. View-only manual
    setActiveWalletSession({
      address: "component_view_only",
      type: "manual",
      walletName: "View-Only",
    });
    await expect(
      client.createSod({ description: "Manual view only", amount: "10" }, "component_view_only")
    ).rejects.toThrow(/view-only/);
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
});
