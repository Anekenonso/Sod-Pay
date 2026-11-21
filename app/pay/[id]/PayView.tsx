"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { Sod } from "@/lib/sod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { MICROCOPY } from "@/lib/constants";
import { ConnectPrompt } from "@/components/wallet/ConnectPrompt";

interface PayViewProps {
  id: string;
}

export function PayView({ id }: PayViewProps) {
  const { client, isDemo } = useDemo();
  const [sod, setSod] = useState<Sod | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidTxId, setPaidTxId] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  const [userAddress, setUserAddress] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sod_user_address");
    }
    return null;
  });
  const [showConnectModal, setShowConnectModal] = useState(false);

  const loadSod = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getSod(id);
      if (!data) {
        setError("Payment link not found");
        return;
      }
      setSod(data);
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
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress) {
      setShowConnectModal(true);
      return;
    }
    await executePayment(userAddress);
  };

  const handleWalletConnected = (addr: string) => {
    setUserAddress(addr);
    if (typeof window !== "undefined") {
      localStorage.setItem("sod_user_address", addr);
    }
    executePayment(addr);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg py-16 px-4 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-white border border-[#E5E5E2] rounded-2xl p-6 space-y-4">
          <div className="h-6 w-1/3 bg-slate-200 rounded" />
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded" />
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

  return (
    <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge status={sod.status} />
                <span className="text-xs text-[#5C5C5C] font-mono">
                  {sod.id.slice(0, 14)}...
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
                {sod.description || "Private Payment"}
              </h1>
            </div>
          </div>

          {/* Cancelled State */}
          {sod.status === "Cancelled" && (
            <div className="rounded-xl border border-[#B33A3A]/20 bg-[#B33A3A]/10 p-5 text-center">
              <h3 className="text-base font-bold text-[#B33A3A]">Payment Cancelled</h3>
              <p className="mt-1 text-xs text-[#5C5C5C]">
                This payment link was cancelled by the creator before any funds were deposited.
              </p>
            </div>
          )}

          {/* Success State (Memorable moment: Payment sent — amount stays private) */}
          {isPaidSuccess && (
            <div className="rounded-xl border border-[#1F7A4D]/30 bg-[#1F7A4D]/10 p-6 text-center space-y-4">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1F7A4D] text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#111111]">
                  Payment sent — amount stays private.
                </h3>
                <p className="mt-1 text-xs text-[#5C5C5C] leading-relaxed">
                  Funds have been deposited into the recipient&apos;s confidential Tari vault. The public ledger never exposes the amount.
                </p>
              </div>
              {paidTxId && (
                <div className="text-left bg-white rounded-lg p-3 border border-[#E5E5E2] text-xs">
                  <span className="text-[#5C5C5C] block">Transaction ID:</span>
                  <span className="font-mono font-medium text-[#111111] break-all">{paidTxId}</span>
                </div>
              )}
            </div>
          )}

          {/* Payment Form (Active if Created) */}
          {sod.status === "Created" && !isPaidSuccess && (
            <form onSubmit={handlePaySubmit} className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#B33A3A]/30 bg-[#B33A3A]/10 p-3.5 text-xs text-[#B33A3A] font-medium"
                >
                  {error}
                </div>
              )}

              {/* Amount Display or Input */}
              {sod.amount ? (
                <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5C5C] mb-1">
                    Requested Amount
                  </label>
                  <div className="text-3xl font-extrabold text-[#0B1D33] tracking-tight">
                    {sod.amount} <span className="text-lg font-bold text-[#5C5C5C]">TARI</span>
                  </div>
                  <p className="mt-2 text-xs text-[#5C5C5C]">
                    Fixed amount required by creator.
                  </p>
                </div>
              ) : (
                <Input
                  label="Payment Amount (TARI)"
                  type="number"
                  step="any"
                  min="0.000001"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 50"
                  helperText="The creator has requested an open amount. Specify the amount to pay."
                  disabled={isPaying}
                />
              )}

              {/* Safety banner (Locked microcopy) */}
              <div className="rounded-lg bg-[#F7F7F5] border border-[#E5E5E2] p-3.5 flex items-start gap-2.5">
                <svg
                  className="h-5 w-5 text-[#1F7A4D] flex-shrink-0 mt-0.5"
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

      <ConnectPrompt
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleWalletConnected}
        actionName="pay this Sod"
        isDemo={isDemo}
      />
    </main>
  );
}
