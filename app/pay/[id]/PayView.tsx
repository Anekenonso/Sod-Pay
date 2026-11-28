"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTariClient } from "@/lib/tari/provider";
import { Sod, isExpired } from "@/lib/sod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { MICROCOPY } from "@/lib/constants";
import { useWallet } from "@/components/wallet/WalletContext";
import { formatFriendlyError } from "@/lib/errors";

interface PayViewProps {
  id: string;
}

export function PayView({ id }: PayViewProps) {
  const client = useTariClient();
  const { toast } = useToast();
  const { address: userAddress, walletType, promptConnect } = useWallet();
  const [sod, setSod] = useState<Sod | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidTxId, setPaidTxId] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);
  const [isLinkExpired, setIsLinkExpired] = useState(false);

  const loadSod = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, currentEpoch] = await Promise.all([
        client.getSod(id),
        client.getCurrentEpoch ? client.getCurrentEpoch().catch(() => null) : Promise.resolve(null),
      ]);
      if (!data) {
        setError("Payment link not found");
        return;
      }
      setSod(data);
      if (currentEpoch !== null && isExpired(data, currentEpoch)) {
        setIsLinkExpired(true);
      } else {
        setIsLinkExpired(false);
      }
      if (data.amount) {
        setCustomAmount(data.amount);
      }
      if (data.status === "Paid" || data.status === "Claimed" || data.status === "Revealed") {
        setIsPaidSuccess(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load payment link");
    } finally {
      setIsLoading(false);
    }
  }, [client, id]);

  useEffect(() => {
    loadSod();
  }, [loadSod]);

  const executePayment = async (payerAddr: string) => {
    if (!sod) return;
    setError(null);

    const amountToPay = sod.amount ? sod.amount : customAmount.trim();

    // Validate positive amount
    const parsedAmount = parseFloat(amountToPay);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }

    // Fixed amount check (Done-when: wrong amount message)
    if (sod.amount !== null && parseFloat(sod.amount) !== parsedAmount) {
      setError(`Wrong amount: expected ${sod.amount} TARI, received ${amountToPay} TARI`);
      return;
    }

    setIsPaying(true);
    try {
      const res = await client.paySod(sod.id, amountToPay, payerAddr);
      setSod(res.sod);
      setPaidTxId(res.txId);
      setIsPaidSuccess(true);
      toast("Payment completed successfully!", "success");
    } catch (err: unknown) {
      const formatted = formatFriendlyError(err, {
        action: "pay",
        walletType,
        detail: err,
      });
      setError(formatted.userMessage);
      toast(formatted.userMessage, { type: "error", detail: formatted.rawMessage });
      // Re-sync on-chain state so stale "Created" UI transitions to closed if already paid/cancelled
      try {
        const latest = await client.getSod(id);
        if (latest) setSod(latest);
      } catch {
        // Ignore refresh failure; keep formatted payment error visible
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      promptConnect("pay this Sod", (addr) => {
        executePayment(addr);
      });
      return;
    }
    await executePayment(userAddress);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 space-y-6">
        <div className="h-8 w-48 bg-[#EFEFEA] rounded" />
        <div className="h-64 bg-white border border-[#E5E5E2] rounded-2xl p-6 space-y-4">
          <div className="h-6 w-1/3 bg-[#EFEFEA] rounded" />
          <div className="h-4 w-1/2 bg-[#EFEFEA] rounded" />
          <div className="h-10 w-full bg-[#F7F7F5] rounded" />
        </div>
      </div>
    );
  }

  if (error && !sod) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 text-center">
        <div className="rounded-2xl border border-[#B33A3A]/30 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#111111]">Payment Link Not Found</h2>
          <p className="mt-2 text-sm text-[#5C5C5C]">
            We could not find any active Sod with component ID: <code className="font-mono text-xs">{id}</code>
          </p>
          <div className="mt-6">
            <Link href="/">
              <Button size="md">Go to Homepage</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sod) return null;

  const isClosed = sod.status !== "Created" || isLinkExpired;

  // Once a Sod is Paid/Claimed/Revealed/Cancelled or expired, lock the payment link for everyone
  // (except the immediate post-submit confirmation screen when paidTxId is present).
  if (isClosed && !paidTxId) {
    return (
      <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-8 shadow-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1D33]/10 text-[#0B1D33]">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#111111]">
              {sod.status === "Cancelled"
                ? "Payment Link Cancelled"
                : isLinkExpired && sod.status === "Created"
                  ? "Payment Link Expired"
                  : "Payment Link Closed"}
            </h1>
            <p className="text-sm text-[#5C5C5C] leading-relaxed">
              {sod.status === "Cancelled"
                ? "This payment link was cancelled by the creator and is no longer accessible."
                : isLinkExpired && sod.status === "Created"
                  ? "This payment link has passed its expiry epoch and can no longer accept deposits."
                  : "This payment link has already been paid and is no longer accessible."}
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button variant="outline" size="md">
                  ← Back to Sod Pay
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-5 sm:p-8 shadow-sm space-y-6 overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-medium text-[#5C5C5C]">
                Private payment request
              </span>
              <h1 className="mt-1 text-2xl font-semibold text-[#111111] tabular-nums break-words">
                {sod.amount ? `${sod.amount} TARI` : "Open payment"}
              </h1>
            </div>
            <Badge status={sod.status} className="flex-shrink-0" />
          </div>

          {/* Description */}
          <div className="rounded-xl bg-[#F7F7F5] border border-[#E5E5E2] p-4">
            <p className="text-xs text-[#5C5C5C] mb-1 font-medium">Payment Note:</p>
            <p className="text-sm text-[#111111] leading-relaxed break-words">
              {sod.description}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#B33A3A]/20 bg-[#B33A3A]/10 p-3.5 text-xs text-[#B33A3A] leading-relaxed"
            >
              {error}
            </div>
          )}

          {/* Paid Success Banner */}
          {isPaidSuccess ? (
            <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#1F7A4D]/10 p-5 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#1F7A4D] text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#111111]">Payment Submitted</h3>
              <p className="text-xs text-[#5C5C5C] leading-relaxed">
                Tari funds have been deposited into the confidential vault. The amount remains hidden on the public ledger.
              </p>
              {paidTxId && (
                <p className="text-[11px] font-mono text-[#5C5C5C] truncate">
                  Tx: {paidTxId}
                </p>
              )}
            </div>
          ) : sod.status === "Cancelled" ? (
            <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6 text-center">
              <p className="text-sm font-medium text-[#111111]">
                This payment link has been cancelled by the creator.
              </p>
              <p className="mt-1 text-xs text-[#5C5C5C]">
                No funds were transferred.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePaySubmit} className="space-y-4">
              {/* If open amount, show input */}
              {!sod.amount && (
                <Input
                  label="Payment Amount (TARI)"
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 50"
                  helperText="Enter the amount of Tari you wish to transfer."
                  disabled={isPaying}
                />
              )}

              {/* Private Payment Safety Reassurance */}
              <div className="rounded-lg bg-[#F7F7F5] border border-[#E5E5E2] p-3 flex items-start gap-2.5">
                <svg
                  className="h-4 w-4 text-[#1F7A4D] flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <p className="text-xs font-medium text-[#111111] leading-relaxed">
                  {MICROCOPY.PAY_PRIVATE}
                </p>
              </div>

              {/* Recipient Details */}
              <div className="rounded-lg border border-[#E5E5E2] p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#5C5C5C]">Recipient:</span>
                  <span className="font-mono text-[#111111]">
                    {sod.creator.length > 18
                      ? `${sod.creator.slice(0, 8)}...${sod.creator.slice(-6)}`
                      : sod.creator}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isPaying}
                className="w-full text-base font-semibold"
              >
                {isPaying ? "Confirming…" : "Pay"}
              </Button>
            </form>
          )}

          {/* Footer Back Link */}
          <div className="pt-2 text-center">
            <Link href="/" className="text-xs text-[#5C5C5C] hover:text-[#111111]">
              ← Back to Sod Pay
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
