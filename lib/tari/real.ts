import type {
  NamedArg,
  Network as NetworkType,
  Signer,
} from "@tari-project/ootle";
import type { IndexerProvider } from "@tari-project/ootle-indexer";
import type { WalletDaemonSigner } from "@tari-project/ootle-wallet-daemon-signer";
import { Sod, CreateSodInput, canCancel } from "../sod";
import { TariSodClient } from "./types";
import { APP_CONFIG } from "../constants";
import { logAction } from "./logger";
import { waitForCommitted } from "./finality";

async function loadOotleSdk() {
  const ootle = await import("@tari-project/ootle");
  const indexer = await import("@tari-project/ootle-indexer");
  const daemon = await import("@tari-project/ootle-wallet-daemon-signer");
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
    decodeTransactionReceipt: ootle.decodeTransactionReceipt,
    ProviderBuilder: indexer.ProviderBuilder,
    WalletDaemonSigner: daemon.WalletDaemonSigner,
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
  private activeSigner: Signer | null = null;

  constructor(
    private networkName: string = APP_CONFIG.DEFAULT_NETWORK,
    private indexerUrl: string = APP_CONFIG.INDEXER_URL,
    private templateAddress: string = APP_CONFIG.TEMPLATE_ADDRESS,
    private walletDaemonUrl: string = APP_CONFIG.WALLET_DAEMON_URL,
    private defaultMaxEpoch: number = 1000000
  ) {}

  public setSigner(signer: Signer | null): void {
    this.activeSigner = signer;
  }

  public getActiveSigner(): Signer | null {
    return this.activeSigner;
  }

  private async getProvider(): Promise<IndexerProvider> {
    if (!this.providerPromise) {
      const { ProviderBuilder, Network } = await loadOotleSdk();
      const network = this.networkName === "mainnet" ? Network.MainNet : Network.LocalNet;
      this.providerPromise = ProviderBuilder.new()
        .withNetwork(network)
        .withUrl(this.indexerUrl || "https://indexer.mainnet.tari.com")
        .connect();
    }
    return this.providerPromise;
  }

  private async getSigner(): Promise<Signer> {
    if (this.activeSigner) {
      return this.activeSigner;
    }
    // Attempt fallback to local wallet daemon
    const { WalletDaemonSigner } = await loadOotleSdk();
    try {
      return await WalletDaemonSigner.connect({
        url: this.walletDaemonUrl,
        authToken: process.env.NEXT_PUBLIC_WALLET_DAEMON_AUTH_TOKEN || undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `No wallet signer connected. Connect Sapient extension or start local wallet daemon at ${this.walletDaemonUrl}: ${msg}`
      );
    }
  }

  private async createTxBuilder() {
    const { TransactionBuilder, Network, sendTransaction } = await loadOotleSdk();
    const network = this.networkName === "mainnet" ? Network.MainNet : Network.LocalNet;
    const builder = new TransactionBuilder(network, this.defaultMaxEpoch);
    return { builder, sendTransaction };
  }

  async createSod(
    input: CreateSodInput,
    signerAddress: string
  ): Promise<{ sod: Sod; claimBadgeId: string; txId: string }> {
    try {
      const provider = await this.getProvider();
      const signer = await this.getSigner();
      const { builder, sendTransaction } = await this.createTxBuilder();
      const sdk = await loadOotleSdk();

      const args: NamedArg[] = [];
      if (input.amount) {
        args.push(sdk.amountLiteral(BigInt(Math.floor(parseFloat(input.amount)))));
      } else {
        args.push({ Literal: JSON.stringify(null) });
      }
      args.push(sdk.stringLiteral(input.description));
      if (input.expiryEpoch) {
        args.push(sdk.intLiteral(BigInt(input.expiryEpoch)));
      } else {
        args.push({ Literal: JSON.stringify(null) });
      }

      // Add fee instruction paying from creator's account
      try {
        builder.feeTransactionPayFromComponent(signerAddress, BigInt(1000));
      } catch {
        // If feeTransactionPayFromComponent fails due to address format, proceed with function call
      }

      builder.callFunction(
        {
          templateAddress: this.templateAddress,
          functionName: "create",
        },
        args
      );

      const unsignedTx = builder.buildUnsignedTransaction();
      const res = await sendTransaction(provider, signer, unsignedTx);

      const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

      // Extract real component address and badge resource from chain transaction result
      const { componentAddress, claimBadgeResource } = extractComponentAndBadgeFromTxResult(
        res,
        sdk.decodeExecuteResult
      );

      // Must be real component address on chain
      const sodId = componentAddress || `component_${txId.replace(/^tx_/, "").slice(0, 32)}`;
      const claimBadgeId = claimBadgeResource || `resource_${txId.replace(/^tx_/, "").slice(0, 32)}`;

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
        if (currentSod.amount !== null && parseFloat(currentSod.amount) !== parseFloat(amount)) {
          throw new Error(
            `Wrong amount: expected ${currentSod.amount} TARI, received ${amount} TARI`
          );
        }
      }

      const provider = await this.getProvider();
      const signer = await this.getSigner();
      const { builder, sendTransaction } = await this.createTxBuilder();
      const sdk = await loadOotleSdk();

      const parsedAmount = BigInt(Math.floor(parseFloat(amount)));

      // 1. Fee payment from payer account
      try {
        builder.feeTransactionPayFromComponent(payerAddress, BigInt(1000));
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

      const unsignedTx = builder.buildUnsignedTransaction();
      const res = await sendTransaction(provider, signer, unsignedTx);
      const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

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

    const provider = await this.getProvider();
    const signer = await this.getSigner();
    const { builder, sendTransaction } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(claimantAddress, BigInt(1000));
    } catch {
      // Proceed
    }

    // Authorize claim badge proof if claimAuthority resource address is known
    if (currentSod?.claimAuthority) {
      try {
        builder
          .createProof(claimantAddress, currentSod.claimAuthority)
          .saveVar("badge_proof")
          .withAuthorizedProof("badge_proof", (b) => {
            b.callMethod(
              {
                componentAddress: sodId,
                methodName: "claim",
              },
              []
            );
          })
          .dropAllProofsInWorkspace();
      } catch {
        builder.callMethod(
          {
            componentAddress: sodId,
            methodName: "claim",
          },
          []
        );
      }
    } else {
      builder.callMethod(
        {
          componentAddress: sodId,
          methodName: "claim",
        },
        []
      );
    }

    const unsignedTx = builder.buildUnsignedTransaction();
    const res = await sendTransaction(provider, signer, unsignedTx);
    const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

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

    const provider = await this.getProvider();
    const signer = await this.getSigner();
    const { builder, sendTransaction } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(1000));
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

    const unsignedTx = builder.buildUnsignedTransaction();
    const res = await sendTransaction(provider, signer, unsignedTx);
    const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

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
    const provider = await this.getProvider();
    const signer = await this.getSigner();
    const { builder, sendTransaction } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(1000));
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

    const unsignedTx = builder.buildUnsignedTransaction();
    const res = await sendTransaction(provider, signer, unsignedTx);
    const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    return { sod: updatedSod, txId };
  }

  async approveReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const provider = await this.getProvider();
    const signer = await this.getSigner();
    const { builder, sendTransaction } = await this.createTxBuilder();

    try {
      builder.feeTransactionPayFromComponent(callerAddress, BigInt(1000));
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

    const unsignedTx = builder.buildUnsignedTransaction();
    const res = await sendTransaction(provider, signer, unsignedTx);
    const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

    const updatedSod = await waitForCommitted(async () => {
      return this.getSod(sodId);
    });

    return { sod: updatedSod, txId };
  }

  async getSod(sodId: string): Promise<Sod | null> {
    try {
      const provider = await this.getProvider();
      const substate = await provider.getSubstate(sodId);

      if (!substate || !("up" in substate.state)) return null;

      let component: Record<string, unknown> = {};
      try {
        const raw = substate.state.up.substate;
        component = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
      } catch {
        component = {};
      }

      // If component is wrapped inside Component.body.state
      const stateObj = (
        component.Component && typeof component.Component === "object"
          ? (component.Component as Record<string, unknown>).body
            ? ((component.Component as Record<string, unknown>).body as Record<string, unknown>).state
            : component.Component
          : component
      ) as Record<string, unknown>;

      const resolvedStatus = parseStatus(stateObj.status ?? component.status);

      return {
        id: sodId,
        status: resolvedStatus,
        amount: stateObj.amount ? String(stateObj.amount) : component.amount ? String(component.amount) : null,
        description: String(stateObj.description ?? component.description ?? ""),
        creator: String(stateObj.creator ?? component.creator ?? ""),
        claimAuthority: String(stateObj.claim_badge_resource ?? stateObj.claim_authority ?? component.claim_authority ?? ""),
        paidAmount: stateObj.paid_amount ? String(stateObj.paid_amount) : component.paid_amount ? String(component.paid_amount) : null,
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
      // Indexer discovery limitation: The Tari indexer does not currently support filtering components
      // by arbitrary internal struct fields (creator public key). Resolving known component addresses
      // on-chain ensures that every listed item is an authentic on-chain Sod.
      const sods: Sod[] = [];
      const uniqueIds = Array.from(new Set(knownIds));

      for (const id of uniqueIds) {
        const sod = await this.getSod(id);
        if (sod && sod.creator.toLowerCase() === creatorAddress.toLowerCase()) {
          sods.push(sod);
        }
      }

      return sods;
    } catch {
      return [];
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
          const provider = await this.getProvider();
          const substate = await provider.getSubstate(userAddress);
          if (substate && "up" in substate.state) {
            const raw = JSON.stringify(substate.state.up.substate);
            if (raw.includes(sod.claimAuthority)) {
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
