"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { Sod, canCancel, canClaim, canRequestReveal, canApproveReveal } from "@/lib/sod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MICROCOPY } from "@/lib/constants";
import { ConnectPrompt } from "@/components/wallet/ConnectPrompt";

interface SodDetailViewProps {
  id: string;
}

export function SodDetailView({ id }: SodDetailViewProps) {
  const { client, isDemo } = useDemo();
  const { toast } = useToast();
  const [sod, setSod] = useState<Sod | null>(null);
  const [holdsBadge, setHoldsBadge] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [userAddress, setUserAddress] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sod_user_address");
    }
    return null;
  });
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadSod = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.getSod(id);
      if (!data) {
        setError("Sod not found");
        return;
      }
      setSod(data);

      if (userAddress) {
        const hasBadge = await client.userHoldsClaimBadge(id, userAddress);
        setHoldsBadge(hasBadge);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load Sod details");
    } finally {
      setIsLoading(false);
    }
  }, [client, id, userAddress]);

  useEffect(() => {
    loadSod();
  }, [loadSod]);

  const payUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${id}`
      : `/pay/${id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(payUrl);
      setCopied(true);
      toast("Link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClaim = async () => {
    if (!userAddress) {
      setShowConnectModal(true);
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.claimSod(id, userAddress);
      setSod(res.sod);
      const msg = "Funds successfully claimed into your wallet!";
      setActionSuccess(msg);
      toast(msg, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to claim Sod";
      setError(msg);
      toast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!userAddress) {
      setShowConnectModal(true);
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.cancelSod(id, userAddress);
      setSod(res.sod);
      const msg = "Sod successfully cancelled.";
      setActionSuccess(msg);
      toast(msg, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel Sod";
      setError(msg);
      toast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReveal = async () => {
    if (!userAddress) {
      setShowConnectModal(true);
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.requestReveal(id, userAddress);
      setSod(res.sod);
      const msg = "Reveal requested! Waiting for the other party to approve.";
      setActionSuccess(msg);
      toast(msg, "info");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to request reveal";
      setError(msg);
      toast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReveal = async () => {
    if (!userAddress) {
      setShowConnectModal(true);
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.approveReveal(id, userAddress);
      setSod(res.sod);
      const msg = "Reveal approved! Amount is now publicly verified.";
      setActionSuccess(msg);
      toast(msg, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve reveal";
      setError(msg);
      toast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 animate-pulse space-y-6">
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
          <h2 className="text-xl font-bold text-[#111111]">Sod Not Found</h2>
          <p className="mt-2 text-sm text-[#5C5C5C]">
            We couldn&apos;t locate a Sod with component ID: <code className="font-mono text-xs">{id}</code>
          </p>
          <div className="mt-6">
            <Link href="/app">
              <Button size="md">Return to My Sods</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!sod) return null;

  const userCanCancel = userAddress ? canCancel(sod, userAddress) : false;
  const userCanClaim = userAddress ? canClaim(sod, userAddress, holdsBadge) : false;
  const userCanReqReveal = userAddress ? canRequestReveal(sod, userAddress) : false;
  const userCanApproveReveal = userAddress ? canApproveReveal(sod, userAddress) : false;

  return (
    <div className="mx-auto max-w-2xl py-10 px-4 sm:px-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
        <Link href="/app" className="hover:text-[#111111]">
          My Sods
        </Link>
        <span>/</span>
        <span className="text-[#111111] font-mono font-medium truncate max-w-[200px]">
          {sod.id}
        </span>
      </div>

      {/* Status Alerts */}
      {actionSuccess && (
        <div role="status" className="rounded-xl border border-[#1F7A4D]/30 bg-[#1F7A4D]/10 p-4 text-sm text-[#1F7A4D] font-medium">
          {actionSuccess}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-[#B33A3A]/30 bg-[#B33A3A]/10 p-4 text-sm text-[#B33A3A] font-medium">
          {error}
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge status={sod.status} />
              {holdsBadge && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F7A4D] bg-[#1F7A4D]/10 border border-[#1F7A4D]/20 px-2 py-0.5 rounded-md">
                  Claim Badge Holder
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              {sod.description || "Payment Request"}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-[#5C5C5C] font-semibold">
              Amount
            </div>
            <div className="text-xl font-bold text-[#0B1D33]">
              {sod.amount ? `${sod.amount} TARI` : "Open amount"}
            </div>
          </div>
        </div>

        {/* Share Link & QR Section (T-11 Done-When requirement) */}
        <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C5C5C]">
              Share Payment Link & QR
            </span>
            <Link href={`/pay/${sod.id}`} className="text-xs text-[#0B1D33] hover:underline font-semibold">
              Open Pay Page →
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={payUrl}
              className="flex-1 rounded-lg border border-[#E5E5E2] bg-white px-3 py-2 text-sm text-[#111111] font-mono select-all focus:outline-none"
            />
            <Button
              onClick={handleCopyLink}
              size="sm"
              className="whitespace-nowrap px-4 font-semibold"
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          {/* QR visual */}
          <div className="flex items-center gap-4 pt-2">
            <div className="h-20 w-20 bg-white border border-[#E5E5E2] rounded-lg p-1.5 flex flex-col items-center justify-center flex-shrink-0">
              <div className="grid grid-cols-4 gap-1 p-1">
                <div className="h-3 w-3 bg-[#0B1D33]" />
                <div className="h-3 w-3 bg-white" />
                <div className="h-3 w-3 bg-[#0B1D33]" />
                <div className="h-3 w-3 bg-[#E8C547]" />
                <div className="h-3 w-3 bg-white" />
                <div className="h-3 w-3 bg-[#0B1D33]" />
                <div className="h-3 w-3 bg-white" />
                <div className="h-3 w-3 bg-[#0B1D33]" />
              </div>
            </div>
            <div className="text-xs text-[#5C5C5C] leading-relaxed">
              Anyone with this link or QR can deposit Tari into the confidential vault. The payment amount stays completely hidden from the public ledger.
            </div>
          </div>
        </div>

        {/* Vault & Privacy Status */}
        <div className="rounded-xl border border-[#E5E5E2] bg-white p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C5C5C]">
            Vault & Amount Privacy
          </h3>
          {sod.isRevealed ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Revealed by Mutual Agreement
              </span>
              <p className="mt-1 text-2xl font-extrabold text-emerald-950 font-mono">
                {sod.paidAmount} TARI
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Both parties approved revealing this confidential payment amount.
              </p>
            </div>
          ) : sod.status === "Paid" || sod.status === "Claimed" ? (
            <div className="rounded-lg border border-[#0B1D33]/20 bg-[#0B1D33]/5 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#1F7A4D]" />
                <span className="text-xs font-bold uppercase text-[#0B1D33]">
                  Confidential Vault Deposited
                </span>
              </div>
              <p className="text-xs text-[#5C5C5C]">
                Amount is stored secretly on Tari Ootle. {MICROCOPY.REVEAL_MUTUAL_REQUIRED}
              </p>
              {sod.revealRequestedBy && (
                <p className="text-xs font-semibold text-[#111111] pt-1">
                  Reveal requested by: <code className="font-mono text-[11px]">{sod.revealRequestedBy}</code>
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#5C5C5C]">
              Awaiting deposit into the confidential vault.
            </p>
          )}
        </div>

        {/* On-Chain Metadata */}
        <div className="rounded-xl border border-[#E5E5E2] bg-white p-4 divide-y divide-[#E5E5E2] text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-[#5C5C5C]">Component Address:</span>
            <span className="font-mono text-[#111111]">{sod.id}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-[#5C5C5C]">Creator Address:</span>
            <span className="font-mono text-[#111111]">{sod.creator}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-[#5C5C5C]">Claim Authority Badge:</span>
            <span className="font-mono text-[#111111]">{sod.claimAuthority}</span>
          </div>
        </div>

        {/* Action Buttons (Claim, Reveal, Cancel) */}
        <div className="pt-2 flex flex-col gap-3">
          {sod.status === "Paid" && !holdsBadge && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{MICROCOPY.CLAIM_BADGE_ONLY}</span>
            </div>
          )}

          {userCanReqReveal && (
            <p className="text-xs text-[#5C5C5C]">
              {MICROCOPY.REVEAL_MUTUAL_REQUIRED} {MICROCOPY.REVEAL_IRREVERSIBLE}
            </p>
          )}

          {userCanApproveReveal && (
            <p className="text-xs text-[#B33A3A] font-medium">
              {MICROCOPY.REVEAL_IRREVERSIBLE}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {userCanClaim && (
              <Button
                onClick={handleClaim}
                disabled={actionLoading}
                size="lg"
                className="flex-1 font-semibold"
              >
                {actionLoading ? "Claiming…" : "Claim Funds"}
              </Button>
            )}

            {userCanReqReveal && (
              <Button
                onClick={handleRequestReveal}
                disabled={actionLoading}
                variant="outline"
                size="lg"
                className="flex-1"
              >
                Request Reveal
              </Button>
            )}

            {userCanApproveReveal && (
              <Button
                onClick={handleApproveReveal}
                disabled={actionLoading}
                size="lg"
                className="flex-1 font-semibold"
              >
                Approve Reveal
              </Button>
            )}

            {userCanCancel && (
              <Button
                onClick={handleCancel}
                disabled={actionLoading}
                variant="outline"
                size="lg"
                className="text-[#B33A3A] border-[#B33A3A]/30 hover:bg-[#B33A3A]/10 flex-1"
              >
                Cancel Sod
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConnectPrompt
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={(addr) => {
          setUserAddress(addr);
          if (typeof window !== "undefined") {
            localStorage.setItem("sod_user_address", addr);
          }
          loadSod();
        }}
        actionName="manage this Sod"
        isDemo={isDemo}
      />
    </div>
  );
}
