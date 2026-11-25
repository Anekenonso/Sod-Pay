import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isSapientAvailable,
  isExtensionAvailable,
  getInjectedExtensions,
} from "../lib/tari/wallet";
import {
  getRealClient,
  setActiveWalletSession,
  setGlobalSigner,
  getGlobalSigner,
} from "../lib/tari/client";
import { tariToMicroTari, formatMicroTari } from "../lib/tari/amounts";
import { generateQrMatrix } from "../lib/qr";

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
    delete (global as any).localStorage;
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

  it("resolves component + vault inputs and strips is_write for extension tari_signAndSubmitTransaction", async () => {
    const client = getRealClient();
    const vaultId = "vault_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const collectedInputs: any[] = [];

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = vi.fn();
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        addInput = (inp: any) => {
          collectedInputs.push({
            substate_id: inp.substate_id,
            version: inp.version,
            is_write: true,
          });
          return this;
        };
        buildUnsignedTransaction = () => ({
          instructions: [{ CallFunction: { function: "create" } }],
          fee_instructions: [],
          inputs: collectedInputs,
          blobs: [],
        });
      },
      sendTransaction: vi.fn(),
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      decodeSubstateValue: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };

    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);
    vi.spyOn(client as any, "getProvider").mockResolvedValue({
      getSubstate: vi.fn().mockResolvedValue({
        state: {
          up: {
            substate: { vaults: { resource_xtr: vaultId } },
          },
        },
      }),
    } as any);

    const requestSpy = vi.fn().mockResolvedValue({
      transaction_id: "tx_inputs_test",
      result: {
        Finalized: {
          diff_summary: {
            upped: [
              { substate_id: "component_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
              { substate_id: "resource_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
            ],
          },
        },
      },
    });

    setActiveWalletSession({
      address: "component_alice_address",
      type: "extension",
      walletName: "Sapient",
      provider: { name: "Sapient", request: requestSpy },
    });

    await client.createSod({ description: "Input test", amount: "10" }, "component_alice_address");

    expect(requestSpy).toHaveBeenCalledTimes(1);
    const callParams = requestSpy.mock.calls[0][0].params;
    expect(callParams.inputs).toEqual([
      { substate_id: "component_alice_address", version: null },
      { substate_id: vaultId, version: null },
    ]);
    // Ensure is_write is NOT sent to extension (SubstateRequirement format)
    expect("is_write" in callParams.inputs[0]).toBe(false);
  });

  it("encodes Option::None args as CBOR hex 'f6' (not JSON 'null') and strips template_ prefix", async () => {
    const client = getRealClient();
    const callFunctionSpy = vi.fn();

    const mockSdk = {
      Network: { MainNet: "mainnet", LocalNet: "localnet" },
      TransactionBuilder: class MockBuilder {
        feeTransactionPayFromComponent = vi.fn();
        callFunction = callFunctionSpy;
        saveVar = vi.fn().mockReturnThis();
        callMethod = vi.fn().mockReturnThis();
        addInput = vi.fn().mockReturnThis();
        buildUnsignedTransaction = () => ({
          instructions: [{ CallFunction: { function: "create" } }],
          fee_instructions: [],
          inputs: [{ substate_id: "component_alice_address", version: null, is_write: true }],
          blobs: [],
        });
      },
      sendTransaction: vi.fn(),
      amountLiteral: (val: any) => ({ Literal: val.toString() }),
      stringLiteral: (val: any) => ({ Literal: val }),
      intLiteral: (val: any) => ({ Literal: val.toString() }),
      decodeExecuteResult: vi.fn(),
      decodeSubstateValue: vi.fn(),
      TARI_RESOURCE_ADDRESS: "resource_xtr",
    };

    vi.spyOn(client as any, "loadSdk").mockResolvedValue(mockSdk);
    vi.spyOn(client as any, "getProvider").mockResolvedValue({
      getSubstate: vi.fn().mockResolvedValue(null),
    } as any);

    const requestSpy = vi.fn().mockResolvedValue({
      transaction_id: "tx_cbor_none_test",
      result: {
        Finalized: {
          diff_summary: {
            upped: [
              { substate_id: "component_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
              { substate_id: "resource_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
            ],
          },
        },
      },
    });

    setActiveWalletSession({
      address: "component_alice_address",
      type: "extension",
      walletName: "Sapient",
      provider: { name: "Sapient", request: requestSpy },
    });

    await client.createSod({ description: "Open amount, no expiry" }, "component_alice_address");

    expect(callFunctionSpy).toHaveBeenCalledTimes(1);
    const [fnDef, args] = callFunctionSpy.mock.calls[0];
    expect(fnDef.templateAddress.startsWith("template_")).toBe(false);
    expect(args[0]).toEqual({ Literal: "f6" });
    expect(args[2]).toEqual({ Literal: "f6" });
  });

  it("decodes CBOR substate in getSod and lists Sods in listSodsByCreator when creator is RistrettoPublicKeyBytes", async () => {
    const client = getRealClient();
    const creatorComponent = "component_b21c512422582f8d0ad0898920348e90180b0d8639ad90dbdb77d7768d680f6b";
    const sodId = "component_fe9e180fd2d4c6407d89fea4f95ed515c940efbdef19283e7300000000000000";
    const badgeHex = "fee2746ce4c72cdb434949ea4c754f34aa159365fa82924d3a00000000000000";
    const pubkeyHex = "1111111111111111111111111111111111111111111111111111111111111111";

    const mockStorage = {
      getItem: vi.fn((k: string) =>
        k === `sod_created_${creatorComponent}` ? JSON.stringify([sodId]) : null
      ),
      setItem: vi.fn(),
    };
    (global as any).window = { localStorage: mockStorage };
    (global as any).localStorage = mockStorage;

    vi.spyOn(client as any, "loadSdk").mockResolvedValue({
      decodeSubstateValue: () => ({
        Component: {
          body: {
            state: {
              "@cbor": "map",
              entries: [
                ["status", 1],
                ["amount", null],
                ["description", "Private link"],
                ["creator", { "@cbor": "bytes", hex: pubkeyHex }],
                [
                  "claim_badge_resource",
                  { "@cbor": "tag", tag: 129, value: { "@cbor": "bytes", hex: badgeHex } },
                ],
                ["is_revealed", false],
              ],
            },
          },
        },
      }),
    });

    vi.spyOn(client as any, "getProvider").mockResolvedValue({
      getSubstate: vi.fn().mockResolvedValue({
        state: { up: { substate: "a16673746174757301" } },
      }),
    } as any);

    const list = await client.listSodsByCreator(creatorComponent);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(sodId);
    expect(list[0].status).toBe("Paid");
    expect(list[0].creator).toBe(pubkeyHex);
    expect(list[0].claimAuthority).toBe(`resource_${badgeHex}`);

    // Also verify userHoldsClaimBadge decodes CBOR account substate to detect the badge resource
    const getSubstateMock = vi.fn()
      .mockResolvedValueOnce({ state: { up: { substate: "cbor_sod_hex" } } })
      .mockResolvedValueOnce({ state: { up: { substate: "cbor_account_hex" } } });
    vi.spyOn(client as any, "getProvider").mockResolvedValue({
      getSubstate: getSubstateMock,
    } as any);
    vi.spyOn(client as any, "loadSdk").mockResolvedValue({
      decodeSubstateValue: (raw: string) =>
        raw === "cbor_sod_hex"
          ? {
              Component: {
                body: {
                  state: {
                    "@cbor": "map",
                    entries: [
                      ["status", 1],
                      ["claim_badge_resource", { "@cbor": "tag", tag: 129, value: { "@cbor": "bytes", hex: badgeHex } }],
                    ],
                  },
                },
              },
            }
          : {
              Component: {
                body: {
                  state: {
                    "@cbor": "map",
                    entries: [
                      [
                        "vaults",
                        {
                          "@cbor": "map",
                          entries: [
                            [
                              { "@cbor": "tag", tag: 129, value: { "@cbor": "bytes", hex: badgeHex } },
                              { "@cbor": "tag", tag: 132, value: { "@cbor": "bytes", hex: "22".repeat(32) } },
                            ],
                          ],
                        },
                      ],
                    ],
                  },
                },
              },
            },
    });

    const holds = await client.userHoldsClaimBadge(sodId, creatorComponent);
    expect(holds).toBe(true);

    // Verify positional array state + tag 131 ResourceAddress (matching mainnet tari_bor encoding)
    vi.spyOn(client as any, "loadSdk").mockResolvedValue({
      decodeSubstateValue: () => ({
        Component: {
          body: {
            state: [
              1,
              null,
              "pay test",
              { "@cbor": "bytes", hex: pubkeyHex },
              { "@cbor": "tag", tag: 131, value: { "@cbor": "bytes", hex: badgeHex } },
              { "@cbor": "tag", tag: 132, value: { "@cbor": "bytes", hex: "22".repeat(32) } },
              null,
              false,
              null,
              { "@cbor": "bytes", hex: "33".repeat(32) },
            ],
          },
        },
      }),
    });
    vi.spyOn(client as any, "getProvider").mockResolvedValue({
      getSubstate: vi.fn().mockResolvedValue({ state: { up: { substate: "cbor_sod_hex" } } }),
    } as any);

    const parsedPositional = await client.getSod(sodId);
    expect(parsedPositional?.status).toBe("Paid");
    expect(parsedPositional?.description).toBe("pay test");
    expect(parsedPositional?.creator).toBe(pubkeyHex);
    expect(parsedPositional?.claimAuthority).toBe(`resource_${badgeHex}`);

    delete (global as any).window;
    delete (global as any).localStorage;
  });

  it("converts whole TARI to microTARI (x 1,000,000) and back cleanly", () => {
    expect(tariToMicroTari("250")).toBe(250_000_000n);
    expect(tariToMicroTari("1.5")).toBe(1_500_000n);
    expect(tariToMicroTari("0.000001")).toBe(1n);
    expect(formatMicroTari("250000000")).toBe("250");
    expect(formatMicroTari("1500000")).toBe("1.5");
    expect(formatMicroTari("250")).toBe("0.00025");
  });

  it("generates a valid scannable QR matrix with 7x7 finder patterns for payment URLs", () => {
    const url = "http://localhost:3000/pay/component_fe9e180fd2d4c6407d89fea4f95ed515c940efbdef19283e7300000000000000";
    const matrix = generateQrMatrix(url);
    const size = matrix.length;
    expect(size).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(size);
    // Top-left 7x7 finder pattern outer ring & center 3x3
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][6]).toBe(true);
    expect(matrix[6][0]).toBe(true);
    expect(matrix[3][3]).toBe(true);
    expect(matrix[1][1]).toBe(false);
  });
});
