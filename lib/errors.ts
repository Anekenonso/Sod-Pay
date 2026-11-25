export interface ActionErrorContext {
  action: "createSod" | "pay" | "claim" | "cancel" | "requestReveal" | "approveReveal" | string;
  walletType?: string | null;
  detail?: unknown;
}

export interface FriendlyErrorResult {
  userMessage: string;
  rawMessage: string;
  detail: unknown;
}

/**
 * Maps raw blockchain, WASM metering, or extension errors into short,
 * calm, user-friendly copy while logging full structured details to console.error.
 */
export function formatFriendlyError(
  err: unknown,
  context: ActionErrorContext
): FriendlyErrorResult {
  const rawMessage = err instanceof Error ? err.message : String(err);
  let detail = context.detail;

  if (!detail && err && typeof err === "object") {
    detail =
      (err as Record<string, unknown>).detail ||
      (err as Record<string, unknown>).data ||
      (err as Record<string, unknown>).receipt ||
      err;
  }

  let userMessage = "Something went wrong. Please try again.";
  const lower = rawMessage.toLowerCase();

  // 1. Fee too low / InsufficientFeesPaid / WASM metering
  if (
    rawMessage.includes("InsufficientFeesPaid") ||
    lower.includes("wasm metering") ||
    lower.includes("increase the transaction fee") ||
    lower.includes("exceeds what the paid fees cover") ||
    lower.includes("insufficient fees")
  ) {
    userMessage = "This action needs a higher network fee. Please try again.";
  }
  // 1b. Already-paid Sod race condition
  else if (rawMessage.includes("Cannot pay: Sod is not in Created status")) {
    userMessage = "This payment link has already been paid.";
  }
  // 1c. On-chain ExecutionFailure / FeeIntentCommit (don't mask as wallet popup rejection)
  else if (
    rawMessage.includes("ExecutionFailure") ||
    rawMessage.includes("FeeIntentCommit") ||
    rawMessage.includes("Transaction failed on chain")
  ) {
    const msgMatch = rawMessage.match(/"message"\s*:\s*"([^"]+)"/);
    userMessage = msgMatch
      ? `On-chain execution failed: ${msgMatch[1]}`
      : "Transaction failed on chain after fee payment. Check console for details.";
  }
  // 2. Wallet rejected / failed to sign
  else if (
    lower.includes("rejected") ||
    lower.includes("denied") ||
    lower.includes("failed to sign") ||
    lower.includes("user cancelled") ||
    lower.includes("user canceled") ||
    lower.includes("not approved")
  ) {
    userMessage = "Your wallet couldn’t approve this action. Check the wallet popup or try reconnecting.";
  }
  // 3. Insufficient balance (when truly balance)
  else if (
    lower.includes("insufficient balance") ||
    lower.includes("not enough funds") ||
    lower.includes("not enough balance") ||
    lower.includes("not enough tari") ||
    lower.includes("insufficient funds")
  ) {
    userMessage = "Not enough balance to complete this action.";
  }
  // 4. Payload / unsupported method (mapped)
  else if (
    lower.includes("transactioninput") ||
    lower.includes("unsupported method") ||
    lower.includes("tari_signtransaction") ||
    lower.includes("json deserialization") ||
    lower.includes("inputs=0") ||
    lower.includes("inputs must be") ||
    lower.includes("failed to deserialize")
  ) {
    userMessage = "Your wallet couldn’t process this request. Please try again or reconnect.";
  }
  // 5. Friendly business/validation messages that are already user-facing
  else if (
    rawMessage.startsWith("Wrong amount:") ||
    rawMessage.startsWith("Description is required") ||
    rawMessage.startsWith("Cannot pay:") ||
    rawMessage.startsWith("Cannot claim:") ||
    rawMessage.startsWith("Cannot cancel:") ||
    rawMessage.startsWith("Only creator can cancel") ||
    rawMessage.startsWith("Please enter a valid")
  ) {
    userMessage = rawMessage;
  }
  // 6. Wallet disconnected
  else if (lower.includes("no wallet connected") || lower.includes("please connect")) {
    userMessage = "Please connect your wallet to approve this action.";
  }

  // Developer logs (always on)
  console.error("[Sod Pay]", {
    action: context.action,
    walletType: context.walletType || "none",
    userMessage,
    rawMessage,
    detail: detail ?? rawMessage,
  });

  return {
    userMessage,
    rawMessage,
    detail: detail ?? rawMessage,
  };
}
