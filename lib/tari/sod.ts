import { Sod, CreateSodInput } from "../sod";
import { TariSodClient } from "./types";
import { logAction } from "./logger";

export class SimTariSodClient implements TariSodClient {
  public readonly mode = "SIMULATED";

  private sods: Map<string, Sod> = new Map();
  // Maps userAddress -> Set of sodIds for which they hold the claim badge
  private badges: Map<string, Set<string>> = new Map();
  // Tracks payer address per sod
  private payers: Map<string, string> = new Map();

  constructor(initialSods: Sod[] = []) {
    for (const sod of initialSods) {
      this.sods.set(sod.id, { ...sod });
    }
  }

  async createSod(
    input: CreateSodInput,
    signerAddress: string
  ): Promise<{ sod: Sod; claimBadgeId: string; txId: string }> {
    if (!signerAddress) {
      throw new Error("Signer address is required to create a Sod");
    }

    const sodId = `sod_sim_${Math.random().toString(36).substring(2, 10)}`;
    const badgeId = `badge_sim_${Math.random().toString(36).substring(2, 10)}`;
    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;

    const newSod: Sod = {
      id: sodId,
      status: "Created",
      amount: input.amount && parseFloat(input.amount) > 0 ? input.amount : null,
      description: input.description,
      creator: signerAddress,
      claimAuthority: badgeId,
      paidAmount: null,
      expiryEpoch: input.expiryEpoch ?? null,
      isRevealed: false,
      revealRequestedBy: null,
      createdAt: Date.now(),
      paidAt: null,
      claimedAt: null,
      revealedAt: null,
    };

    this.sods.set(sodId, newSod);

    // Grant claim badge to creator
    if (!this.badges.has(signerAddress.toLowerCase())) {
      this.badges.set(signerAddress.toLowerCase(), new Set());
    }
    this.badges.get(signerAddress.toLowerCase())!.add(sodId);

    logAction({
      action: "CREATE_SOD",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...newSod }, claimBadgeId: badgeId, txId };
  }

  async paySod(
    sodId: string,
    amount: string,
    payerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const sod = this.sods.get(sodId);
    if (!sod) {
      logAction({
        action: "PAY_SOD",
        sodId,
        txId: null,
        mode: "SIMULATED",
        result: "FAILED",
        error: "Sod not found",
      });
      throw new Error("Sod not found");
    }

    if (sod.status !== "Created") {
      logAction({
        action: "PAY_SOD",
        sodId,
        txId: null,
        mode: "SIMULATED",
        result: "FAILED",
        error: `Cannot pay: status is ${sod.status}`,
      });
      throw new Error(`Cannot pay: status is ${sod.status}`);
    }

    const payNum = parseFloat(amount);
    if (isNaN(payNum) || payNum <= 0) {
      throw new Error("Invalid payment amount");
    }

    if (sod.amount !== null) {
      const expectedNum = parseFloat(sod.amount);
      if (payNum !== expectedNum) {
        throw new Error(
          `Wrong amount: expected ${sod.amount} TARI, received ${amount} TARI`
        );
      }
    }

    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;

    sod.status = "Paid";
    sod.paidAmount = amount; // Confidential inside vault until reveal
    sod.paidAt = Date.now();
    this.payers.set(sodId, payerAddress);

    logAction({
      action: "PAY_SOD",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...sod }, txId };
  }

  async claimSod(
    sodId: string,
    claimantAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const sod = this.sods.get(sodId);
    if (!sod) throw new Error("Sod not found");

    const holdsBadge = await this.userHoldsClaimBadge(sodId, claimantAddress);
    if (!holdsBadge) {
      logAction({
        action: "CLAIM_SOD",
        sodId,
        txId: null,
        mode: "SIMULATED",
        result: "FAILED",
        error: "Claim badge required",
      });
      throw new Error("Unauthorized: Only claim badge holder can unlock funds");
    }

    if (sod.status !== "Paid" && sod.status !== "Revealed") {
      throw new Error(`Cannot claim: status is ${sod.status}`);
    }

    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;
    sod.status = "Claimed";
    sod.claimedAt = Date.now();

    logAction({
      action: "CLAIM_SOD",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...sod }, txId };
  }

  async cancelSod(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const sod = this.sods.get(sodId);
    if (!sod) throw new Error("Sod not found");

    if (sod.creator.toLowerCase() !== callerAddress.toLowerCase()) {
      throw new Error("Unauthorized: Only creator can cancel");
    }

    if (sod.status !== "Created") {
      logAction({
        action: "CANCEL_SOD",
        sodId,
        txId: null,
        mode: "SIMULATED",
        result: "FAILED",
        error: `Cannot cancel: status is ${sod.status}`,
      });
      throw new Error(`Cannot cancel: Sod status is ${sod.status}`);
    }

    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;
    sod.status = "Cancelled";

    logAction({
      action: "CANCEL_SOD",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...sod }, txId };
  }

  async requestReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const sod = this.sods.get(sodId);
    if (!sod) throw new Error("Sod not found");

    if (sod.status !== "Paid" && sod.status !== "Claimed") {
      throw new Error("Reveal can only be requested on Paid or Claimed Sods");
    }

    if (sod.isRevealed) {
      throw new Error("Sod amount is already revealed");
    }

    if (sod.revealRequestedBy !== null) {
      throw new Error("Reveal has already been requested; awaiting approval");
    }

    const isCreator = sod.creator.toLowerCase() === callerAddress.toLowerCase();
    const payer = this.payers.get(sodId);
    const isPayer = payer ? payer.toLowerCase() === callerAddress.toLowerCase() : false;

    if (!isCreator && !isPayer) {
      throw new Error("Unauthorized: Only creator or payer can request reveal");
    }

    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;
    sod.revealRequestedBy = callerAddress;

    logAction({
      action: "REQUEST_REVEAL",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...sod }, txId };
  }

  async approveReveal(
    sodId: string,
    callerAddress: string
  ): Promise<{ sod: Sod; txId: string }> {
    const sod = this.sods.get(sodId);
    if (!sod) throw new Error("Sod not found");

    if (sod.isRevealed) {
      throw new Error("Already revealed");
    }

    if (sod.revealRequestedBy === null) {
      throw new Error("No pending reveal request to approve");
    }

    if (sod.revealRequestedBy.toLowerCase() === callerAddress.toLowerCase()) {
      throw new Error("Cannot approve own reveal request; mutual consent required (R-05)");
    }

    const isCreator = sod.creator.toLowerCase() === callerAddress.toLowerCase();
    const payer = this.payers.get(sodId);
    const isPayer = payer ? payer.toLowerCase() === callerAddress.toLowerCase() : false;

    if (!isCreator && !isPayer) {
      throw new Error("Unauthorized: Only creator or payer can approve reveal");
    }

    const txId = `tx_sim_${Math.random().toString(36).substring(2, 12)}`;
    sod.isRevealed = true;
    sod.revealedAt = Date.now();
    sod.status = "Revealed";

    logAction({
      action: "APPROVE_REVEAL",
      sodId,
      txId,
      mode: "SIMULATED",
      result: "SUCCESS",
    });

    return { sod: { ...sod }, txId };
  }

  async getSod(sodId: string): Promise<Sod | null> {
    const sod = this.sods.get(sodId);
    return sod ? { ...sod } : null;
  }

  async listSodsByCreator(creatorAddress: string): Promise<Sod[]> {
    const results: Sod[] = [];
    for (const sod of this.sods.values()) {
      if (sod.creator.toLowerCase() === creatorAddress.toLowerCase()) {
        results.push({ ...sod });
      }
    }
    return results.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  async userHoldsClaimBadge(sodId: string, userAddress: string): Promise<boolean> {
    const userBadges = this.badges.get(userAddress.toLowerCase());
    return !!userBadges && userBadges.has(sodId);
  }
}
