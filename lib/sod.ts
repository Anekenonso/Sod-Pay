export type SodStatus = "Created" | "Paid" | "Claimed" | "Cancelled" | "Revealed";

export interface Sod {
  id: string;
  status: SodStatus;
  amount: string | null; // null = open amount
  description: string;
  creator: string;
  payer?: string | null;
  claimAuthority: string; // Badge resource address / id
  paidAmount: string | null; // Confidential until reveal
  expiryEpoch: number | null;
  isRevealed: boolean;
  revealRequestedBy: string | null;
  createdAt: number | null;
  paidAt: number | null;
  claimedAt: number | null;
  revealedAt: number | null;
}

export interface CreateSodInput {
  amount?: string | null;
  description: string;
  expiryEpoch?: number | null;
}

/**
 * Checks if a Sod is expired based on current epoch.
 */
export function isExpired(sod: Sod, currentEpoch: number): boolean {
  if (sod.expiryEpoch === null) return false;
  return currentEpoch > sod.expiryEpoch;
}

/**
 * Checks if a user can cancel a Sod.
 * Locked invariant: Cancel only by creator, only from Created status.
 */
export function canCancel(sod: Sod, userAddress: string): boolean {
  if (!userAddress) return false;
  if (sod.status !== "Created") return false;
  return sod.creator.toLowerCase() === userAddress.toLowerCase();
}

/**
 * Checks if a user can pay a Sod.
 * Locked invariant: Pay only when status is Created and not expired.
 */
export function canPay(sod: Sod, currentEpoch?: number): boolean {
  if (sod.status !== "Created") return false;
  if (currentEpoch !== undefined && isExpired(sod, currentEpoch)) return false;
  return true;
}

/**
 * Checks if a user can claim funds from a Sod.
 * Locked invariant: Claim only when status is Paid, and only claim-badge holder can claim.
 */
export function canClaim(
  sod: Sod,
  userAddress: string,
  holdsClaimBadge: boolean
): boolean {
  if (!userAddress || !holdsClaimBadge) return false;
  // Funds can be claimed if Paid (or Revealed if already revealed)
  if (sod.status !== "Paid" && sod.status !== "Revealed") return false;
  return true;
}

/**
 * Checks if a user can initiate a reveal request.
 * Locked invariant: Either party (creator or payer) may request reveal when Paid/Claimed/Revealed,
 * provided not already revealed and not already requested.
 */
export function canRequestReveal(
  sod: Sod,
  userAddress: string,
  payerAddress?: string | null
): boolean {
  if (!userAddress) return false;
  if (sod.isRevealed) return false;
  if (sod.revealRequestedBy !== null) return false;
  if (sod.status !== "Paid" && sod.status !== "Claimed") return false;

  const isCreator = sod.creator.toLowerCase() === userAddress.toLowerCase();
  const isPayer = payerAddress
    ? payerAddress.toLowerCase() === userAddress.toLowerCase()
    : false;

  // Can be requested by creator or known payer (or any participant party)
  return isCreator || isPayer;
}

/**
 * Checks if a user can approve a pending reveal request.
 * Locked invariant: Mutual reveal only. Requires two distinct parties.
 * The approving party must NOT be the one who requested it.
 */
export function canApproveReveal(
  sod: Sod,
  userAddress: string,
  payerAddress?: string | null
): boolean {
  if (!userAddress) return false;
  if (sod.isRevealed) return false;
  if (sod.revealRequestedBy === null) return false;
  // Cannot approve own request - must be distinct party
  if (sod.revealRequestedBy.toLowerCase() === userAddress.toLowerCase()) {
    return false;
  }
  if (sod.status !== "Paid" && sod.status !== "Claimed") return false;

  const isCreator = sod.creator.toLowerCase() === userAddress.toLowerCase();
  const isPayer = payerAddress
    ? payerAddress.toLowerCase() === userAddress.toLowerCase()
    : false;

  return isCreator || isPayer;
}
