import {
  TransactionBuilder,
  Network,
  sendTransaction,
  NamedArg,
} from "@tari-project/ootle";
import { ProviderBuilder, IndexerProvider } from "@tari-project/ootle-indexer";
import { WalletDaemonSigner } from "@tari-project/ootle-wallet-daemon-signer";
import { Sod, CreateSodInput } from "../sod";
import { TariSodClient } from "./types";
import { APP_CONFIG } from "../constants";
import { logAction } from "./logger";
import { waitForCommitted } from "./finality";

export class RealTariSodClient implements TariSodClient {
  public readonly mode = "REAL";
  private providerPromise: Promise<IndexerProvider> | null = null;

  constructor(
    private network: Network = Network.MainNet,
    private indexerUrl: string = APP_CONFIG.INDEXER_URL,
    private templateAddress: string = APP_CONFIG.TEMPLATE_ADDRESS,
    private walletDaemonUrl: string = APP_CONFIG.WALLET_DAEMON_URL,
    private defaultMaxEpoch: number = 1000000
  ) {}

  private async getProvider(): Promise<IndexerProvider> {
    if (!this.providerPromise) {
      this.providerPromise = ProviderBuilder.new()
        .withNetwork(this.network)
        .withUrl(this.indexerUrl || "https://indexer.mainnet.tari.com")
        .connect();
    }
    return this.providerPromise;
  }

  private async getSigner(): Promise<WalletDaemonSigner> {
    return WalletDaemonSigner.connect({
      url: this.walletDaemonUrl,
      authToken: process.env.WALLET_DAEMON_AUTH_TOKEN || undefined,
    });
  }

  async createSod(
    input: CreateSodInput,
    signerAddress: string
  ): Promise<{ sod: Sod; claimBadgeId: string; txId: string }> {
    try {
      const provider = await this.getProvider();
      const signer = await this.getSigner();

      // Build transaction invoking template create function with validity window (maxEpoch)
      const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);

      const args: NamedArg[] = [];
      if (input.amount) {
        args.push({ Literal: JSON.stringify(input.amount) });
      }
      args.push({ Literal: JSON.stringify(input.description) });
      if (input.expiryEpoch) {
        args.push({ Literal: JSON.stringify(input.expiryEpoch) });
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
      const sodId = `sod_${txId.slice(0, 8)}`;
      const claimBadgeId = `badge_${txId.slice(0, 8)}`;

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
      const provider = await this.getProvider();
      const signer = await this.getSigner();

      const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);
      const args: NamedArg[] = [{ Literal: JSON.stringify(amount) }];

      builder.callMethod(
        {
          componentAddress: sodId,
          methodName: "pay",
        },
        args
      );

      const unsignedTx = builder.buildUnsignedTransaction();
      const res = await sendTransaction(provider, signer, unsignedTx);
      const txId = (res as { transaction_id?: string }).transaction_id || `tx_${Date.now()}`;

      const updatedSod = await waitForCommitted(async () => {
        return this.getSod(sodId);
      });

      logAction({
        action: "PAY_SOD",
        sodId,
        txId,
        mode: "REAL",
        result: "SUCCESS",
      });

      return { sod: updatedSod, txId };
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
    const provider = await this.getProvider();
    const signer = await this.getSigner();

    const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);
    builder.callMethod(
      {
        componentAddress: sodId,
        methodName: "claim",
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

  async cancelSod(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const provider = await this.getProvider();
    const signer = await this.getSigner();

    const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);
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

    return { sod: updatedSod, txId };
  }

  async requestReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const provider = await this.getProvider();
    const signer = await this.getSigner();

    const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);
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

    const builder = new TransactionBuilder(this.network, this.defaultMaxEpoch);
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
        component = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as Record<string, unknown>);
      } catch {
        component = {};
      }

      return {
        id: sodId,
        status: (component.status as Sod["status"]) || "Created",
        amount: component.amount ? String(component.amount) : null,
        description: String(component.description || ""),
        creator: String(component.creator || ""),
        claimAuthority: String(component.claim_authority || ""),
        paidAmount: component.paid_amount ? String(component.paid_amount) : null,
        expiryEpoch: (component.expiry_epoch as number) ?? null,
        isRevealed: Boolean(component.is_revealed),
        revealRequestedBy: (component.reveal_requested_by as string) || null,
        createdAt: (component.created_at as number) ?? null,
        paidAt: (component.paid_at as number) ?? null,
        claimedAt: (component.claimed_at as number) ?? null,
        revealedAt: (component.revealed_at as number) ?? null,
      };
    } catch {
      return null;
    }
  }

  async listSodsByCreator(creatorAddress: string): Promise<Sod[]> {
    return [];
  }

  async userHoldsClaimBadge(sodId: string, userAddress: string): Promise<boolean> {
    return false;
  }
}
