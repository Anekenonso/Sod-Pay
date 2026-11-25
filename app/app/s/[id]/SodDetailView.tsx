"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTariClient } from "@/lib/tari/provider";
import { Sod, canCancel, canClaim, canRequestReveal, canApproveReveal } from "@/lib/sod";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MICROCOPY } from "@/lib/constants";
import { useWallet } from "@/components/wallet/WalletContext";
import { formatFriendlyError } from "@/lib/errors";
import { QrCode } from "@/components/ui/QrCode";

interface SodDetailViewProps {
  id: string;
}

export function SodDetailView({ id }: SodDetailViewProps) {
  const client = useTariClient();
  const { toast } = useToast();
  const { address: userAddress, walletType, promptConnect } = useWallet();
  const [sod, setSod] = useState<Sod | null>(null);
  const [holdsBadge, setHoldsBadge] = useState<boolean>(false);
  const [userPubkey, setUserPubkey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        const [hasBadge, pubkey] = await Promise.all([
          client.userHoldsClaimBadge(id, userAddress),
          client.getAccountPublicKey ? client.getAccountPublicKey(userAddress) : Promise.resolve(null),
        ]);
        setHoldsBadge(hasBadge);
        setUserPubkey(pubkey);
      } else {
        setUserPubkey(null);
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

  const executeClaim = async (addr: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.claimSod(id, addr);
      setSod(res.sod);
      const msg = "Funds successfully claimed into your wallet!";
      setActionSuccess(msg);
      toast(msg, "success");
    } catch (err: unknown) {
      const formatted = formatFriendlyError(err, {
        action: "claim",
        walletType,
        detail: err,
      });
      setError(formatted.userMessage);
      toast(formatted.userMessage, { type: "error", detail: formatted.rawMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!userAddress) {
      promptConnect("claim funds", (addr) => executeClaim(addr));
      return;
    }
    await executeClaim(userAddress);
  };

  const executeCancel = async (addr: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.cancelSod(id, addr);
      setSod(res.sod);
      const msg = "Sod successfully cancelled.";
      setActionSuccess(msg);
      toast(msg, "info");
    } catch (err: unknown) {
      const formatted = formatFriendlyError(err, {
        action: "cancel",
        walletType,
        detail: err,
      });
      setError(formatted.userMessage);
      toast(formatted.userMessage, { type: "error", detail: formatted.rawMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!userAddress) {
      promptConnect("cancel Sod", (addr) => executeCancel(addr));
      return;
    }
    await executeCancel(userAddress);
  };

  const executeRequestReveal = async (addr: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.requestReveal(id, addr);
      setSod(res.sod);
      const msg = "Reveal requested! Waiting for the other party to approve.";
      setActionSuccess(msg);
      toast(msg, "info");
    } catch (err: unknown) {
      const formatted = formatFriendlyError(err, {
        action: "requestReveal",
        walletType,
        detail: err,
      });
      setError(formatted.userMessage);
      toast(formatted.userMessage, { type: "error", detail: formatted.rawMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReveal = async () => {
    if (!userAddress) {
      promptConnect("request reveal", (addr) => executeRequestReveal(addr));
      return;
    }
    await executeRequestReveal(userAddress);
  };

  const executeApproveReveal = async (addr: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await client.approveReveal(id, addr);
      setSod(res.sod);
      const msg = "Reveal approved! Amount is now publicly verified.";
      setActionSuccess(msg);
      toast(msg, "success");
    } catch (err: unknown) {
      const formatted = formatFriendlyError(err, {
        action: "approveReveal",
        walletType,
        detail: err,
      });
      setError(formatted.userMessage);
      toast(formatted.userMessage, { type: "error", detail: formatted.rawMessage });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveReveal = async () => {
    if (!userAddress) {
      promptConnect("approve reveal", (addr) => executeApproveReveal(addr));
      return;
    }
    await executeApproveReveal(userAddress);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
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

  const partyId = userAddress
    ? sod.creator.startsWith("component_")
      ? userAddress
      : userPubkey || userAddress
    : "";
  const payerId = sod.payer || null;

  const userCanCancel = partyId ? canCancel(sod, partyId) : false;
  const userCanClaim = userAddress ? canClaim(sod, userAddress, holdsBadge) : false;
  const userCanReqReveal = partyId ? canRequestReveal(sod, partyId, payerId) : false;
  const userCanApproveReveal = partyId ? canApproveReveal(sod, partyId, payerId) : false;

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
      <div className="rounded-2xl border border-[#E5E5E2] bg-white p-5 sm:p-8 shadow-sm space-y-6 overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge status={sod.status} />
              {holdsBadge && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F7A4D] bg-[#1F7A4D]/10 border border-[#1F7A4D]/20 px-2 py-0.5 rounded-md">
                  Claim badge holder
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] break-words">
              {sod.description || "Payment Request"}
            </h1>
          </div>
          <div className="sm:text-right flex-shrink-0">
            <div className="text-xs text-[#5C5C5C] font-medium">
              Amount
            </div>
            <div className="text-xl font-semibold text-[#0B1D33] tabular-nums">
              {sod.amount ? `${sod.amount} TARI` : "Open amount"}
            </div>
          </div>
        </div>

        {/* Share Link & QR Section (only active while Sod is in Created status) */}
        {sod.status === "Created" ? (
          <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#5C5C5C]">
                Share payment link &amp; QR
              </span>
              <Link href={`/pay/${sod.id}`} className="text-xs text-[#0B1D33] hover:underline font-medium flex-shrink-0">
                Open pay page →
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={payUrl}
                className="flex-1 min-w-0 w-full rounded-lg border border-[#E5E5E2] bg-white px-3 py-2 text-sm text-[#111111] font-mono select-all focus:outline-none truncate"
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                className="whitespace-nowrap px-4 font-semibold min-h-[40px] justify-center"
              >
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>

            {/* Scannable QR Code */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-2 text-center sm:text-left">
              <div className="bg-white border border-[#E5E5E2] rounded-lg p-1.5 flex items-center justify-center flex-shrink-0">
                <QrCode value={payUrl} size={104} />
              </div>
              <div className="text-xs text-[#5C5C5C] leading-relaxed">
                Anyone with this link or QR can deposit Tari into the confidential vault. The payment amount stays completely hidden from the public ledger.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] px-4 py-3 text-xs text-[#5C5C5C]">
            Payment link is closed — this Sod is already <span className="font-semibold text-[#111111]">{sod.status}</span> and can no longer be paid.
          </div>
        )}

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
                <p className="text-xs font-semibold text-[#111111] pt-1 break-all">
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
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <span className="text-[#5C5C5C] flex-shrink-0">Component Address</span>
            <span className="font-mono text-[#111111] break-all sm:truncate sm:max-w-[65%] sm:text-right" title={sod.id}>
              {sod.id}
            </span>
          </div>
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <span className="text-[#5C5C5C] flex-shrink-0">Creator Address</span>
            <span className="font-mono text-[#111111] break-all sm:truncate sm:max-w-[65%] sm:text-right" title={sod.creator}>
              {sod.creator || "—"}
            </span>
          </div>
          <div className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
            <span className="text-[#5C5C5C] flex-shrink-0">Claim Authority Badge</span>
            <span className="font-mono text-[#111111] break-all sm:truncate sm:max-w-[65%] sm:text-right" title={sod.claimAuthority}>
              {sod.claimAuthority || "—"}
            </span>
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
    </div>
  );
}
