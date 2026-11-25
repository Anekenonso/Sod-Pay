import type {
  NamedArg,
  Signer,
} from "@tari-project/ootle";
import type { IndexerProvider } from "@tari-project/ootle-indexer";
import { Sod, CreateSodInput, canCancel } from "../sod";
import { TariSodClient } from "./types";
import { APP_CONFIG, FEES } from "../constants";
import { logAction } from "./logger";
import { waitForCommitted } from "./finality";
import type { ActiveWalletSession } from "./client";
import { tariToMicroTari, formatMicroTari } from "./amounts";

async function loadOotleSdk() {
  const ootle = await import("@tari-project/ootle");
  const indexer = await import("@tari-project/ootle-indexer");
  return {
    TransactionBuilder: ootle.TransactionBuilder,
    Network: ootle.Network,
    sendTransaction: ootle.sendTransaction,
    amountLiteral: ootle.amountLiteral,
    resourceAddressLiteral: ootle.resourceAddressLiteral,
    stringLiteral: ootle.stringLiteral,
    intLiteral: ootle.intLiteral,
    TARI_RESOURCE_ADDRESS: ootle.TARI_RESOURCE_ADDRESS,
    decodeExecuteResult: ootle.decodeExecuteResult,
    decodeSubstateValue: ootle.decodeSubstateValue,
    ProviderBuilder: indexer.ProviderBuilder,
  };
}

/**
 * Parses the created component address and badge resource address from a transaction receipt.
 */
function extractComponentAndBadgeFromTxResult(
  res: unknown,
  decodeExecuteResultFn?: (encoded: string) => unknown
): { componentAddress: string | null; claimBadgeResource: string | null } {
  let componentAddress: string | null = null;
  let claimBadgeResource: string | null = null;

  if (!res || typeof res !== "object") {
    return { componentAddress: null, claimBadgeResource: null };
  }

  const resultObj = res as Record<string, unknown>;

  // Check if result has finalized execution_result
  const finalized =
    resultObj.result && typeof resultObj.result === "object" && "Finalized" in resultObj.result
      ? (resultObj.result as Record<string, unknown>).Finalized
      : null;

  if (finalized && typeof finalized === "object") {
    const finObj = finalized as Record<string, unknown>;

    // 1. Try decoding execution_result if available
    if (finObj.execution_result && decodeExecuteResultFn) {
      try {
        const decoded = (
          typeof finObj.execution_result === "string"
            ? decodeExecuteResultFn(finObj.execution_result)
            : finObj.execution_result
        ) as Record<string, unknown>;

        const finalize = decoded?.finalize as Record<string, unknown> | undefined;
        const accept = (finalize?.result as Record<string, unknown> | undefined)?.Accept as
          | Record<string, unknown>
          | undefined;

        if (accept && Array.isArray(accept.up_substates)) {
          for (const [substateId] of accept.up_substates) {
            const idStr = String(
              typeof substateId === "object" && substateId !== null
                ? (substateId as Record<string, unknown>).Component ||
                    (substateId as Record<string, unknown>).Resource ||
                    JSON.stringify(substateId)
                : substateId
            );
            if (idStr.includes("component_") && !componentAddress) {
              const match = idStr.match(/component_[0-9a-fA-F]+/);
              if (match) componentAddress = match[0];
            }
            if (idStr.includes("resource_") && !claimBadgeResource) {
              const match = idStr.match(/resource_[0-9a-fA-F]+/);
              if (match) claimBadgeResource = match[0];
            }
          }
        }
      } catch {
        // Fall back to direct properties
      }
    }

    // 2. Check diff_summary
    const diffSummary = finObj.diff_summary as Record<string, unknown> | undefined;
    if (diffSummary && Array.isArray(diffSummary.upped)) {
      for (const item of diffSummary.upped) {
        const idStr = String(item.substate_id || "");
        if (idStr.startsWith("component_") && !componentAddress) {
          componentAddress = idStr;
        }
        if (idStr.startsWith("resource_") && !claimBadgeResource) {
          claimBadgeResource = idStr;
        }
      }
    }
  }

  // 3. String regex fallback across entire JSON payload
  if (!componentAddress) {
    try {
      const jsonStr = JSON.stringify(res);
      const compMatch = jsonStr.match(/component_[0-9a-fA-F]{64}/);
      if (compMatch) {
        componentAddress = compMatch[0];
      }
      const resMatch = jsonStr.match(/resource_[0-9a-fA-F]{64}/);
      if (resMatch) {
        claimBadgeResource = resMatch[0];
      }
    } catch {
      // Ignore stringify error
    }
  }

  return { componentAddress, claimBadgeResource };
}

function extractVaultIdsFromValue(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) extractVaultIdsFromValue(item, out);
    return;
  }
  if (!value || typeof value !== "object") return;

  const obj = value as Record<string, unknown>;
  const cborKind = obj["@cbor"];
  if (typeof cborKind === "string") {
    if (cborKind === "tag") {
      const inner = obj.value as Record<string, unknown> | undefined;
      if (obj.tag === 132 && inner && inner["@cbor"] === "bytes" && typeof inner.hex === "string") {
        if (inner.hex.length === 64) {
          out.add(`vault_${inner.hex}`);
        }
      }
      extractVaultIdsFromValue(obj.value, out);
    } else if (cborKind === "map" && Array.isArray(obj.entries)) {
      for (const entry of obj.entries) {
        if (Array.isArray(entry) && entry.length === 2) {
          extractVaultIdsFromValue(entry[0], out);
          extractVaultIdsFromValue(entry[1], out);
        }
      }
    }
    return;
  }

  for (const v of Object.values(obj)) {
    extractVaultIdsFromValue(v, out);
  }
}

function extractVaultIdsFromSubstate(
  substate: unknown,
  decodeSubstateValueFn?: (encoded: string) => unknown
): string[] {
  const vaults = new Set<string>();
  if (!substate || typeof substate !== "object") return [];

  const subObj = substate as Record<string, unknown>;
  const state = subObj.state as Record<string, unknown> | undefined;
  const up = state && "up" in state ? (state.up as Record<string, unknown>) : null;
  const rawSubstate = up?.substate;

  if (typeof rawSubstate === "string" && decodeSubstateValueFn) {
    try {
      const decoded = decodeSubstateValueFn(rawSubstate) as Record<string, unknown>;
      const comp = decoded?.Component as Record<string, unknown> | undefined;
      const body = comp?.body as Record<string, unknown> | undefined;
      if (body?.state) {
        extractVaultIdsFromValue(body.state, vaults);
      }
    } catch {
      // Fall back to regex scan below
    }
  } else if (rawSubstate && typeof rawSubstate === "object") {
    extractVaultIdsFromValue(rawSubstate, vaults);
  }

  try {
    const jsonStr = JSON.stringify(substate);
    const matches = jsonStr.match(/vault_[0-9a-fA-F]{64}/g);
    if (matches) {
      for (const m of matches) vaults.add(m);
    }
  } catch {
    // Ignore stringify error
  }

  return Array.from(vaults);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function decodeCborBytes(bytes: Uint8Array): unknown {
  let offset = 0;

  function readUint(addl: number): number {
    if (addl < 24) return addl;
    if (addl === 24) return bytes[offset++];
    if (addl === 25) {
      const v = (bytes[offset] << 8) | bytes[offset + 1];
      offset += 2;
      return v;
    }
    if (addl === 26) {
      const v =
        ((bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3]) >>>
        0;
      offset += 4;
      return v;
    }
    if (addl === 27) {
      let v = 0n;
      for (let i = 0; i < 8; i++) {
        v = (v << 8n) | BigInt(bytes[offset++]);
      }
      return Number(v);
    }
    return 0;
  }

  function readItem(): unknown {
    const initial = bytes[offset++];
    const major = initial >> 5;
    const addl = initial & 0x1f;

    if (major === 0) return readUint(addl);
    if (major === 1) return -1 - readUint(addl);
    if (major === 2) {
      const len = readUint(addl);
      const slice = bytes.subarray(offset, offset + len);
      offset += len;
      return bytesToHex(slice);
    }
    if (major === 3) {
      const len = readUint(addl);
      const slice = bytes.subarray(offset, offset + len);
      offset += len;
      return new TextDecoder().decode(slice);
    }
    if (major === 4) {
      const len = readUint(addl);
      const arr: unknown[] = [];
      for (let i = 0; i < len; i++) arr.push(readItem());
      return arr;
    }
    if (major === 5) {
      const len = readUint(addl);
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < len; i++) {
        const k = String(readItem());
        obj[k] = readItem();
      }
      return obj;
    }
    if (major === 6) {
      const tag = readUint(addl);
      const val = readItem();
      if (typeof val === "string" && val.length === 64) {
        if (tag === 128) return `component_${val}`;
        if (tag === 129 || tag === 131) return `resource_${val}`;
        if (tag === 132) return `vault_${val}`;
      }
      return val;
    }
    if (major === 7) {
      if (addl === 20) return false;
      if (addl === 21) return true;
      if (addl === 22 || addl === 23) return null;
    }
    return null;
  }

  return readItem();
}

function decodeCborFromBase64OrHex(encoded: string): unknown {
  const trimmed = encoded.trim();
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    const bytes = new Uint8Array(trimmed.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
    }
    return decodeCborBytes(bytes);
  }
  const binary = atob(trimmed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decodeCborBytes(bytes);
}

function cborValueToJs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cborValueToJs);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const obj = value as Record<string, unknown>;
  const cborKind = obj["@cbor"];
  if (typeof cborKind === "string") {
    if (cborKind === "bytes" && typeof obj.hex === "string") {
      return obj.hex;
    }
    if (cborKind === "tag") {
      const inner = cborValueToJs(obj.value);
      if (typeof inner === "string" && inner.length === 64) {
        if (obj.tag === 128) return `component_${inner}`;
        if (obj.tag === 129 || obj.tag === 131) return `resource_${inner}`;
        if (obj.tag === 132) return `vault_${inner}`;
      }
      return inner;
    }
    if (cborKind === "map" && Array.isArray(obj.entries)) {
      const out: Record<string, unknown> = {};
      for (const entry of obj.entries) {
        if (Array.isArray(entry) && entry.length === 2) {
          const k = String(cborValueToJs(entry[0]));
          out[k] = cborValueToJs(entry[1]);
        }
      }
      return out;
    }
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = cborValueToJs(v);
  }
  return out;
}

function parseStatus(rawStatus: unknown): Sod["status"] {
  if (rawStatus === 0 || rawStatus === "0" || rawStatus === "Created") return "Created";
  if (rawStatus === 1 || rawStatus === "1" || rawStatus === "Paid") return "Paid";
  if (rawStatus === 2 || rawStatus === "2" || rawStatus === "Claimed") return "Claimed";
  if (rawStatus === 3 || rawStatus === "3" || rawStatus === "Cancelled") return "Cancelled";
  if (rawStatus === 4 || rawStatus === "4" || rawStatus === "Revealed") return "Revealed";
  return "Created";
}

export class RealTariSodClient implements TariSodClient {
  public readonly mode = "REAL";
  private providerPromise: Promise<IndexerProvider> | null = null;
  private activeSession: ActiveWalletSession | null = null;
  private activeSigner: Signer | null = null;
  private accountPubkeyCache = new Map<string, string>();

  constructor(
    private networkName: string = APP_CONFIG.DEFAULT_NETWORK,
    private indexerUrl: string = APP_CONFIG.INDEXER_URL,
    private templateAddress: string = APP_CONFIG.TEMPLATE_ADDRESS,
    private walletDaemonUrl: string = APP_CONFIG.WALLET_DAEMON_URL,
    private defaultMaxEpoch: number = 1000000
  ) {}

  public setActiveSession(session: ActiveWalletSession | null): void {
    this.activeSession = session;
    this.activeSigner = session?.signer || null;
  }

  public getActiveSession(): ActiveWalletSession | null {
    return this.activeSession;
  }

  public setSigner(signer: Signer | null): void {
    this.activeSigner = signer;
    if (signer) {
      this.activeSession = {
        address: "",
        type: "daemon",
        walletName: "Daemon",
        signer,
      };
    } else {
      this.activeSession = null;
    }
  }

  public getActiveSigner(): Signer | null {
    return this.activeSigner;
  }

  private async getProvider(): Promise<IndexerProvider> {
    if (!this.providerPromise) {
      const { ProviderBuilder, Network } = await this.loadSdk();
      const network = this.networkName === "mainnet" ? Network.MainNet : Network.LocalNet;
      this.providerPromise = ProviderBuilder.new()
        .withNetwork(network)
        .withUrl(this.indexerUrl || "https://indexer.mainnet.tari.com")
        .connect();
    }
    return this.providerPromise;
  }

  protected async loadSdk() {
    return loadOotleSdk();
  }

  private async createTxBuilder() {
    const sdk = await this.loadSdk();
    const network = this.networkName === "mainnet" ? sdk.Network.MainNet : sdk.Network.LocalNet;
    const builder = new sdk.TransactionBuilder(network, this.defaultMaxEpoch);
    return { builder, sendTransaction: sdk.sendTransaction };
  }

  /**
   * Declares component addresses and their child vaults as transaction inputs
   * so both daemon (`resolveInputs`) and browser extensions receive explicit inputs.
   */
  private async addComponentInputs(builder: any, addresses: string[]): Promise<void> {
    if (typeof builder.addInput !== "function") return;

    const seen = new Set<string>();
    const uniqueAddresses = addresses.filter((addr) => {
      if (!addr || seen.has(addr)) return false;
      seen.add(addr);
      return true;
    });

    for (const addr of uniqueAddresses) {
      builder.addInput({ substate_id: addr, version: null });
    }

    try {
      const sdk = await this.loadSdk();
      const provider = await this.getProvider();
      if (!provider || typeof provider.getSubstate !== "function") return;

      for (const addr of uniqueAddresses) {
        try {
          const substate = await provider.getSubstate(addr);
          const vaultIds = extractVaultIdsFromSubstate(substate, sdk.decodeSubstateValue);
          for (const vaultId of vaultIds) {
            if (!seen.has(vaultId)) {
              seen.add(vaultId);
              builder.addInput({ substate_id: vaultId, version: null });
            }
          }
        } catch {
          // Substate may not be indexed yet or mock provider may omit getSubstate
        }
      }
    } catch {
      // Indexer unavailable (e.g. unit test environment)
    }
  }

  /**
   * Executes a transaction using ONLY the connected wallet session.
   * If session is an extension (Sapient or compatible): uses tari_signAndSubmitTransaction.
   * If session is daemon: uses daemon signer via sendTransaction.
   * Never silently falls back to daemon when an extension is connected.
   */
  private async executeTransaction(
    builder: any,
    maxFee: string = FEES.CREATE_MAX_FEE
  ): Promise<{ txId: string; res: unknown }> {
    if (!this.activeSession || !this.activeSession.type) {
      throw new Error(
        "No wallet connected. Please connect your browser extension or local daemon to sign this transaction."
      );
    }

    if (this.activeSession.type === "manual") {
      throw new Error(
        "Connected manual address is view-only. Please connect a browser extension or wallet daemon to sign transactions."
      );
    }

    // 1. Browser extension session (Sapient or any injected Tari provider)
    if (this.activeSession.type === "extension" || this.activeSession.type === "sapient") {
      const provider = this.activeSession.provider;
      if (!provider) {
        throw new Error(
          "Connected extension session is missing the injected provider. Please reconnect your extension."
        );
      }

      const unsignedTx = builder.buildUnsignedTransaction();
      const instructions = unsignedTx.instructions;

      const params: {
        instructions: unknown[];
        maxFee: string;
        dryRun?: boolean;
        inputs?: unknown[];
      } = {
        instructions,
        maxFee,
        dryRun: false,
      };

      if (Array.isArray(unsignedTx.inputs) && unsignedTx.inputs.length > 0) {
        params.inputs = unsignedTx.inputs.map((inp: any) => ({
          substate_id: inp.substate_id,
          version: inp.version ?? null,
        }));
      }

      let res: any;
      if (typeof provider.request === "function") {
        try {
          res = await provider.request({
            method: "tari_signAndSubmitTransaction",
            params,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("not connected") || msg.includes("tari_requestAccounts")) {
            try {
              await provider.request({ method: "tari_requestAccounts" });
              res = await provider.request({
                method: "tari_signAndSubmitTransaction",
                params,
              });
            } catch (retryErr: unknown) {
              const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              throw new Error(`Extension rejected or failed to sign and submit: ${retryMsg}`);
            }
          } else {
            throw new Error(`Extension rejected or failed to sign and submit: ${msg}`);
          }
        }
      } else if (typeof provider.signAndSubmitTransaction === "function") {
        try {
          res = await provider.signAndSubmitTransaction(params);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Extension rejected or failed to sign and submit: ${msg}`);
        }
      } else {
        throw new Error(
          `${this.activeSession.walletName || "Connected extension"} does not support tari_signAndSubmitTransaction.`
        );
      }

      let txId: string;
      if (typeof res === "string") {
        txId = res;
      } else if (res && typeof res === "object") {
        txId =
          (res as any).transaction_id ||
          (res as any).tx_id ||
          (res as any).transactionId ||
          (res as any).id ||
          `tx_${Date.now()}`;
      } else {
        txId = `tx_${Date.now()}`;
      }

      // Surface on-chain FeeIntentCommit / Reject / Abort failures instead of silently succeeding
      if (res && typeof res === "object") {
        const anyRes = res as any;
        const resultObj = anyRes.result || anyRes;
        if (resultObj && (resultObj.Reject || resultObj.Abort)) {
          throw new Error(`Transaction aborted on chain: ${JSON.stringify(resultObj.Reject || resultObj.Abort)}`);
        }
        const jsonStr = JSON.stringify(res);
        if (jsonStr.includes("ExecutionFailure") || jsonStr.includes("FeeIntentCommit")) {
          const execMatch = jsonStr.match(/"ExecutionFailure"\s*:\s*(\{[^}]+\})/);
          throw new Error(`Transaction failed on chain (fee paid): ${execMatch ? execMatch[1] : jsonStr}`);
        }
      }

      return { txId, res };
    }

    // 2. Local daemon session (User explicitly selected daemon)
    if (this.activeSession.type === "daemon") {
      let signer = this.activeSession.signer;
      if (!signer) {
        const { WalletDaemonSigner } = await import("@tari-project/ootle-wallet-daemon-signer");
        signer = await WalletDaemonSigner.connect({
          url: this.walletDaemonUrl,
          authToken: process.env.NEXT_PUBLIC_WALLET_DAEMON_AUTH_TOKEN || undefined,
        });
        this.activeSession.signer = signer;
      }

      const provider = await this.getProvider();
      const { sendTransaction } = await this.createTxBuilder();
      const unsignedTx = builder.buildUnsignedTransaction();

      const res = await sendTransaction(provider, signer, unsignedTx);
      const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;
      // Surface on-chain FeeIntentCommit / Reject / Abort failures instead of silently succeeding
      if (res && typeof res === "object") {
        const anyRes = res as any;
        const resultObj = anyRes.result || anyRes;
        if (resultObj && (resultObj.Reject || resultObj.Abort)) {
          throw new Error(`Transaction aborted on chain: ${JSON.stringify(resultObj.Reject || resultObj.Abort)}`);
        }
        const jsonStr = JSON.stringify(res);
        if (jsonStr.includes("ExecutionFailure") || jsonStr.includes("FeeIntentCommit")) {
          const execMatch = jsonStr.match(/"ExecutionFailure"\s*:\s*(\{[^}]+\})/);
          throw new Error(`Transaction failed on chain (fee paid): ${execMatch ? execMatch[1] : jsonStr}`);
        }
      }

      return { txId, res };
    }

    throw new Error(`Unsupported wallet session type: ${this.activeSession.type}`);
  }

  async createSod(
    input: CreateSodInput,
    signerAddress: string
  ): Promise<{ sod: Sod; claimBadgeId: string; txId: string }> {
    try {
      const { builder } = await this.createTxBuilder();
      const sdk = await this.loadSdk();

      // Option<T>::None in tari_bor CBOR is 0xf6 (null), hex-encoded as "f6"
      const CBOR_NONE_LITERAL = { Literal: "f6" } as const;

      const args: NamedArg[] = [];
      if (input.amount) {
        args.push(sdk.amountLiteral(tariToMicroTari(input.amount)));
      } else {
        args.push(CBOR_NONE_LITERAL);
      }
      args.push(sdk.stringLiteral(input.description));
      if (input.expiryEpoch) {
        args.push(sdk.intLiteral(BigInt(input.expiryEpoch)));
      } else {
        args.push(CBOR_NONE_LITERAL);
      }

      // Add fee instruction paying from creator's account
      try {
        builder.feeTransactionPayFromComponent(signerAddress, BigInt(FEES.CREATE_MAX_FEE));
      } catch {
        // If feeTransactionPayFromComponent fails due to address format, proceed with function call
      }

      builder.callFunction(
        {
          templateAddress: this.templateAddress.replace(/^template_/, ""),
          functionName: "create",
        },
        args
      );

      // Deposit the minted claim badge bucket (index 1 of (Component, Bucket)) into the creator's account
      try {
        if (typeof builder.saveVar === "function") {
          builder.saveVar("create_result");
        }
        if (typeof builder.callMethod === "function") {
          builder.callMethod(
            {
              componentAddress: signerAddress,
              methodName: "deposit",
            },
            [{ Workspace: "create_result.1" }]
          );
        }
      } catch {
        // Fall back if builder does not support chaining or in mock environments
      }

      // Declare creator account and its vaults as transaction inputs
      await this.addComponentInputs(builder, [signerAddress]);

      const { txId, res } = await this.executeTransaction(builder, FEES.CREATE_MAX_FEE);

      // Extract real component address and badge resource from chain transaction result
      let { componentAddress, claimBadgeResource } = extractComponentAndBadgeFromTxResult(
        res,
        sdk.decodeExecuteResult
      );

      // If not immediately available in extension submit result, query indexer for finalized receipt
      if (!componentAddress && txId && !txId.startsWith("tx_mock") && !txId.startsWith("tx_")) {
        try {
          const indexerProvider = await this.getProvider();
          const txResult = await indexerProvider.getTransactionResult(txId);
          const fromIndexer = extractComponentAndBadgeFromTxResult(
            txResult,
            sdk.decodeExecuteResult
          );
          if (fromIndexer.componentAddress) componentAddress = fromIndexer.componentAddress;
          if (fromIndexer.claimBadgeResource) claimBadgeResource = fromIndexer.claimBadgeResource;
        } catch {
          // Indexer fetch may fail if not yet indexed
        }
      }

      // Check if transaction was rejected/aborted on chain
      if (res && typeof res === "object") {
        const anyRes = res as any;
        if (anyRes.result && (anyRes.result.Reject || anyRes.result.Abort)) {
          const reason = JSON.stringify(anyRes.result.Reject || anyRes.result.Abort);
          throw new Error(`Transaction aborted on chain: ${reason}`);
        }
      }

      if (!componentAddress) {
        if (typeof res === "object" && res !== null) {
          const jsonStr = JSON.stringify(res);
          const compMatch = jsonStr.match(/component_[0-9a-fA-F]{64}/);
          if (compMatch) componentAddress = compMatch[0];
          const badgeMatch = jsonStr.match(/resource_[0-9a-fA-F]{64}/);
          if (badgeMatch) claimBadgeResource = badgeMatch[0];
        }
      }

      // Real component address required on chain (P0 requirement)
      const sodId =
        componentAddress || (txId.startsWith("tx_mock") ? `component_mock_${Date.now()}` : null);
      if (!sodId) {
        throw new Error(
          `Transaction submitted (${txId}), but could not resolve on-chain component address. Please verify on indexer.`
        );
      }

      const claimBadgeId =
        claimBadgeResource || `resource_${txId.replace(/^tx_/, "").slice(0, 32)}`;

      // Cache known component address for creator session listing
      if (typeof window !== "undefined") {
        try {
          const key = `sod_created_${signerAddress}`;
          const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          if (!existing.includes(sodId)) {
            existing.push(sodId);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          // Local storage unavailable
        }
      }

      const newSod: Sod = {
        id: sodId,
        status: "Created",
        amount: input.amount || null,
        description: input.description,
        creator: signerAddress,
        claimAuthority: claimBadgeId,
        paidAmount: null,
        expiryEpoch: input.expiryEpoch ?? null,
        isRevealed: false,
        revealRequestedBy: null,
        createdAt: Date.now(),
        paidAt: null,
        claimedAt: null,
        revealedAt: null,
      };

      logAction({
        action: "CREATE_SOD",
        sodId,
        txId,
        mode: "REAL",
        result: "SUCCESS",
      });

      return { sod: newSod, claimBadgeId, txId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logAction({
        action: "CREATE_SOD",
        sodId: null,
        txId: null,
        mode: "REAL",
        result: "FAILED",
        error: errorMsg,
      });
      throw err;
    }
  }

  async paySod(
    sodId: string,
    amount: string,
    payerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    try {
      // Validate preconditions before building transaction
      const currentSod = await this.getSod(sodId);
      if (currentSod) {
        if (currentSod.status !== "Created") {
          throw new Error("Cannot pay: Sod is not in Created status");
        }
        if (
          currentSod.amount !== null &&
          tariToMicroTari(currentSod.amount) !== tariToMicroTari(amount)
        ) {
          throw new Error(
            `Wrong amount: expected ${currentSod.amount} TARI, received ${amount} TARI`
          );
        }
      }

      const { builder } = await this.createTxBuilder();
      const sdk = await this.loadSdk();

      const parsedAmount = tariToMicroTari(amount);

      // 1. Fee payment from payer account
      try {
        builder.feeTransactionPayFromComponent(payerAddress, BigInt(FEES.PAY_MAX_FEE));
      } catch {
        // Proceed if fee pay not applicable
      }

      // 2. Withdraw payment amount from payer account into workspace bucket (ABI match)
      builder
        .callMethod(
          {
            componentAddress: payerAddress,
            methodName: "withdraw",
          },
          [
            sdk.resourceAddressLiteral(sdk.TARI_RESOURCE_ADDRESS),
            sdk.amountLiteral(parsedAmount),
          ]
        )
        .saveVar("payment_bucket")
        // 3. Deposit the workspace bucket into Sod component vault via pay(payment: Bucket)
        .callMethod(
          {
            componentAddress: sodId,
            methodName: "pay",
          },
          [{ Workspace: "payment_bucket" }]
        );

      // Declare payer account, Sod component, and their vaults as transaction inputs
      await this.addComponentInputs(builder, [payerAddress, sodId]);

      const { txId } = await this.executeTransaction(builder, FEES.PAY_MAX_FEE);

      // Cache known component address for payer session listing
      if (typeof window !== "undefined") {
        try {
          const key = `sod_paid_${payerAddress}`;
          const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          if (!existing.includes(sodId)) {
            existing.push(sodId);
            localStorage.setItem(key, JSON.stringify(existing));
          }
        } catch {
          // Local storage unavailable
        }
      }

      const updatedSod = await waitForCommitted(async () => {
        return this.getSod(sodId);
      });

      const finalSod: Sod = updatedSod || {
        id: sodId,
        status: "Paid",
        amount: currentSod?.amount || amount,
        description: currentSod?.description || "",
        creator: currentSod?.creator || "",
        claimAuthority: currentSod?.claimAuthority || "",
        paidAmount: amount,
        expiryEpoch: currentSod?.expiryEpoch || null,
        isRevealed: false,
        revealRequestedBy: null,
        createdAt: currentSod?.createdAt || Date.now(),
        paidAt: Date.now(),
        claimedAt: null,
        revealedAt: null,
      };

      logAction({
        action: "PAY_SOD",
        sodId,
        txId,
        mode: "REAL",
        result: "SUCCESS",
      });

      return { sod: finalSod, txId };
    } catch (err: unknown) {
      logAction({
        action: "PAY_SOD",
        sodId,
        txId: null,
        mode: "REAL",
        result: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async claimSod(
    sodId: string,
    claimantAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const currentSod = await this.getSod(sodId);
    if (currentSod && currentSod.status !== "Paid" && currentSod.status !== "Revealed") {
      throw new Error("Cannot claim: funds are not Paid");
    }

    const { builder } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(claimantAddress, BigInt(FEES.CLAIM_MAX_FEE));
    } catch {
      // Proceed
    }

    // Authorize claim badge proof if claimAuthority resource address is known
    if (currentSod?.claimAuthority) {
      try {
        builder
          .createProof(claimantAddress, currentSod.claimAuthority)
          .saveVar("badge_proof")
          .withAuthorizedProof("badge_proof", (b: any) => {
            b.callMethod(
              {
                componentAddress: sodId,
                methodName: "claim",
              },
              []
            )
              .saveVar("claimed_funds")
              .callMethod(
                {
                  componentAddress: claimantAddress,
                  methodName: "deposit",
                },
                [{ Workspace: "claimed_funds" }]
              );
          })
          .dropAllProofsInWorkspace();
      } catch {
        try {
          builder
            .callMethod(
              {
                componentAddress: sodId,
                methodName: "claim",
              },
              []
            )
            .saveVar("claimed_funds")
            .callMethod(
              {
                componentAddress: claimantAddress,
                methodName: "deposit",
              },
              [{ Workspace: "claimed_funds" }]
            );
        } catch {
          builder.callMethod(
            {
              componentAddress: sodId,
              methodName: "claim",
            },
            []
          );
        }
      }
    } else {
      try {
        builder
          .callMethod(
            {
              componentAddress: sodId,
              methodName: "claim",
            },
            []
          )
          .saveVar("claimed_funds")
          .callMethod(
            {
              componentAddress: claimantAddress,
              methodName: "deposit",
            },
            [{ Workspace: "claimed_funds" }]
          );
      } catch {
        builder.callMethod(
          {
            componentAddress: sodId,
            methodName: "claim",
          },
          []
        );
      }
    }

    await this.addComponentInputs(builder, [claimantAddress, sodId]);

    const { txId } = await this.executeTransaction(builder, FEES.CLAIM_MAX_FEE);

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    const finalSod: Sod = updatedSod || {
      id: sodId,
      status: "Claimed",
      amount: currentSod?.amount || null,
      description: currentSod?.description || "",
      creator: currentSod?.creator || claimantAddress,
      claimAuthority: currentSod?.claimAuthority || "",
      paidAmount: currentSod?.paidAmount || null,
      expiryEpoch: currentSod?.expiryEpoch || null,
      isRevealed: currentSod?.isRevealed || false,
      revealRequestedBy: currentSod?.revealRequestedBy || null,
      createdAt: currentSod?.createdAt || Date.now(),
      paidAt: currentSod?.paidAt || null,
      claimedAt: Date.now(),
      revealedAt: currentSod?.revealedAt || null,
    };

    return { sod: finalSod, txId };
  }

  async cancelSod(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const currentSod = await this.getSod(sodId);
    if (currentSod) {
      if (!canCancel(currentSod, callerAddress)) {
        if (currentSod.status !== "Created") {
          throw new Error("Cannot cancel: only Created Sods can be cancelled");
        }
        throw new Error("Only creator can cancel");
      }
    }

    const { builder } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(FEES.CANCEL_MAX_FEE));
    } catch {
      // Proceed
    }

    builder.callMethod(
      {
        componentAddress: sodId,
        methodName: "cancel",
      },
      []
    );

    await this.addComponentInputs(builder, [callerAddress, sodId]);

    const { txId } = await this.executeTransaction(builder, FEES.CANCEL_MAX_FEE);

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    const finalSod: Sod = updatedSod || {
      id: sodId,
      status: "Cancelled",
      amount: currentSod?.amount || null,
      description: currentSod?.description || "",
      creator: currentSod?.creator || callerAddress,
      claimAuthority: currentSod?.claimAuthority || "",
      paidAmount: null,
      expiryEpoch: currentSod?.expiryEpoch || null,
      isRevealed: false,
      revealRequestedBy: null,
      createdAt: currentSod?.createdAt || Date.now(),
      paidAt: null,
      claimedAt: null,
      revealedAt: null,
    };

    return { sod: finalSod, txId };
  }

  async requestReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const { builder } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(FEES.REVEAL_MAX_FEE));
    } catch {
      // Proceed
    }

    builder.callMethod(
      {
        componentAddress: sodId,
        methodName: "request_reveal",
      },
      []
    );

    await this.addComponentInputs(builder, [callerAddress, sodId]);

    const { txId } = await this.executeTransaction(builder, FEES.REVEAL_MAX_FEE);

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    return { sod: updatedSod, txId };
  }

  async approveReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const { builder } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(FEES.REVEAL_MAX_FEE));
    } catch {
      // Proceed
    }

    builder.callMethod(
      {
        componentAddress: sodId,
        methodName: "approve_reveal",
      },
      []
    );

    await this.addComponentInputs(builder, [callerAddress, sodId]);

    const { txId } = await this.executeTransaction(builder, FEES.REVEAL_MAX_FEE);

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    return { sod: updatedSod, txId };
  }

  async getSod(sodId: string): Promise<Sod | null> {
    try {
      const sdk = await this.loadSdk();
      const provider = await this.getProvider();
      const substate = await provider.getSubstate(sodId);

      if (!substate || !("up" in substate.state)) return null;

      let component: Record<string, unknown> = {};
      const raw = substate.state.up.substate;
      if (typeof raw === "string") {
        if (raw.trim().startsWith("{")) {
          try {
            component = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            component = {};
          }
        } else {
          let decoded = false;
          if (typeof sdk.decodeSubstateValue === "function") {
            try {
              component = cborValueToJs(sdk.decodeSubstateValue(raw)) as Record<string, unknown>;
              decoded = true;
            } catch (err) {
              console.warn("[Sod Pay] decodeSubstateValue failed, using CBOR fallback:", err);
            }
          }
          if (!decoded) {
            try {
              component = decodeCborFromBase64OrHex(raw) as Record<string, unknown>;
            } catch (err) {
              console.warn("[Sod Pay] CBOR fallback decode failed:", err);
              component = {};
            }
          }
        }
      } else if (raw && typeof raw === "object") {
        component = cborValueToJs(raw) as Record<string, unknown>;
      }

      // If component is wrapped inside Component.body.state
      const rawState =
        component.Component && typeof component.Component === "object"
          ? (component.Component as Record<string, unknown>).body
            ? ((component.Component as Record<string, unknown>).body as Record<string, unknown>).state
            : component.Component
          : component;

      const decodedState =
        typeof rawState === "string"
          ? decodeCborFromBase64OrHex(rawState)
          : rawState || {};

      // `tari_bor` serializes the Rust `SodPay` struct as a positional 10-element array
      const stateObj = (
        Array.isArray(decodedState)
          ? {
              status: decodedState[0],
              amount: decodedState[1],
              description: decodedState[2],
              creator: decodedState[3],
              claim_badge_resource: decodedState[4],
              vault: decodedState[5],
              expiry_epoch: decodedState[6],
              is_revealed: decodedState[7],
              reveal_requested_by: decodedState[8],
              payer: decodedState[9],
            }
          : decodedState
      ) as Record<string, unknown>;

      const resolvedStatus = parseStatus(stateObj.status ?? component.status);

      return {
        id: sodId,
        status: resolvedStatus,
        amount:
          stateObj.amount !== undefined && stateObj.amount !== null
            ? formatMicroTari(String(stateObj.amount))
            : component.amount !== undefined && component.amount !== null
            ? formatMicroTari(String(component.amount))
            : null,
        description: String(stateObj.description ?? component.description ?? ""),
        creator: String(stateObj.creator ?? component.creator ?? ""),
        payer:
          stateObj.payer !== undefined && stateObj.payer !== null
            ? String(stateObj.payer)
            : component.payer !== undefined && component.payer !== null
            ? String(component.payer)
            : null,
        claimAuthority: String(stateObj.claim_badge_resource ?? stateObj.claim_authority ?? component.claim_authority ?? ""),
        paidAmount:
          stateObj.paid_amount !== undefined && stateObj.paid_amount !== null
            ? formatMicroTari(String(stateObj.paid_amount))
            : component.paid_amount !== undefined && component.paid_amount !== null
            ? formatMicroTari(String(component.paid_amount))
            : null,
        expiryEpoch: ((stateObj.expiry_epoch ?? component.expiry_epoch) as number) ?? null,
        isRevealed: Boolean(stateObj.is_revealed ?? component.is_revealed),
        revealRequestedBy: ((stateObj.reveal_requested_by ?? component.reveal_requested_by) as string) || null,
        createdAt: ((stateObj.created_at ?? component.created_at) as number) ?? null,
        paidAt: ((stateObj.paid_at ?? component.paid_at) as number) ?? null,
        claimedAt: ((stateObj.claimed_at ?? component.claimed_at) as number) ?? null,
        revealedAt: ((stateObj.revealed_at ?? component.revealed_at) as number) ?? null,
      };
    } catch {
      return null;
    }
  }

  async listSodsByCreator(creatorAddress: string): Promise<Sod[]> {
    try {
      if (!creatorAddress) return [];

      const knownIds: string[] = [];

      // Retrieve cached component addresses created in sessions
      if (typeof window !== "undefined") {
        try {
          const key = `sod_created_${creatorAddress}`;
          const stored: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(stored)) {
            knownIds.push(...stored);
          }
        } catch {
          // Local storage unavailable
        }
      }

      // On-chain resolution: Verify each component address directly against the on-chain substate.
      const sods: Sod[] = [];
      const uniqueIds = Array.from(new Set(knownIds));

      for (const id of uniqueIds) {
        const sod = await this.getSod(id);
        if (!sod) continue;
        // On-chain `SodPay.creator` is `RistrettoPublicKeyBytes` (64-char hex), whereas `creatorAddress` is `component_...`.
        // Only filter by string equality when `sod.creator` is itself a component address.
        if (
          sod.creator.startsWith("component_") &&
          sod.creator.toLowerCase() !== creatorAddress.toLowerCase()
        ) {
          continue;
        }
        sods.push(sod);
      }

      return sods;
    } catch {
      return [];
    }
  }

  async listSodsByPayer(payerAddress: string): Promise<Sod[]> {
    try {
      if (!payerAddress) return [];

      const knownIds: string[] = [];
      if (typeof window !== "undefined") {
        try {
          const key = `sod_paid_${payerAddress}`;
          const stored: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(stored)) {
            knownIds.push(...stored);
          }
        } catch {
          // Local storage unavailable
        }
      }

      const sods: Sod[] = [];
      const uniqueIds = Array.from(new Set(knownIds));
      for (const id of uniqueIds) {
        const sod = await this.getSod(id);
        if (sod) sods.push(sod);
      }

      return sods;
    } catch {
      return [];
    }
  }

  async getAccountPublicKey(accountAddress: string): Promise<string | null> {
    if (!accountAddress) return null;
    if (!accountAddress.startsWith("component_")) return accountAddress;
    const cached = this.accountPubkeyCache.get(accountAddress);
    if (cached) return cached;

    try {
      const sdk = await this.loadSdk();
      const provider = await this.getProvider();
      const substate = await provider.getSubstate(accountAddress);
      if (!substate || !("up" in substate.state)) return null;

      const raw = substate.state.up.substate;
      let decoded: Record<string, unknown> = {};
      if (typeof raw === "string" && typeof sdk.decodeSubstateValue === "function") {
        decoded = cborValueToJs(sdk.decodeSubstateValue(raw)) as Record<string, unknown>;
      } else if (raw && typeof raw === "object") {
        decoded = cborValueToJs(raw) as Record<string, unknown>;
      }

      const comp = decoded.Component as Record<string, unknown> | undefined;
      const header = comp?.header as Record<string, unknown> | undefined;
      const ownerRule = header?.owner_rule as Record<string, unknown> | undefined;
      const byPubKey = ownerRule?.ByPublicKey;
      if (typeof byPubKey === "string" && byPubKey.length > 0) {
        this.accountPubkeyCache.set(accountAddress, byPubKey);
        return byPubKey;
      }
      return null;
    } catch {
      return null;
    }
  }

  async userHoldsClaimBadge(sodId: string, userAddress: string): Promise<boolean> {
    try {
      if (!userAddress) return false;

      const sod = await this.getSod(sodId);
      if (!sod) return false;

      // Claim is valid only when funds are Paid or Revealed
      if (sod.status !== "Paid" && sod.status !== "Revealed") {
        return false;
      }

      // 1. On-chain query: Check claimant account substate vaults for the claim badge resource
      if (sod.claimAuthority) {
        try {
          const sdk = await this.loadSdk();
          const provider = await this.getProvider();
          const substate = await provider.getSubstate(userAddress);
          if (substate && "up" in substate.state) {
            const rawSubstate = substate.state.up.substate;
            let searchable = JSON.stringify(rawSubstate);
            if (typeof rawSubstate === "string" && !rawSubstate.trim().startsWith("{")) {
              let decoded: unknown = null;
              if (typeof sdk.decodeSubstateValue === "function") {
                try {
                  decoded = cborValueToJs(sdk.decodeSubstateValue(rawSubstate));
                } catch {
                  decoded = null;
                }
              }
              if (!decoded) {
                try {
                  decoded = decodeCborFromBase64OrHex(rawSubstate);
                } catch {
                  decoded = null;
                }
              }
              if (decoded) {
                searchable = JSON.stringify(decoded);
              }
            }
            const bareResourceHex = sod.claimAuthority.replace(/^resource_/, "");
            if (searchable.includes(sod.claimAuthority) || (bareResourceHex && searchable.includes(bareResourceHex))) {
              return true;
            }
          }
        } catch {
          // Indexer or account substate query error
        }
      }

      // 2. Protocol invariant: The non-fungible claim badge is minted directly to the creator
      if (sod.creator.toLowerCase() === userAddress.toLowerCase()) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
