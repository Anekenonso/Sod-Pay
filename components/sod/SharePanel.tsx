"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sod } from "@/lib/sod";
import { Button } from "@/components/ui/Button";

interface SharePanelProps {
  sod: Sod;
  claimBadgeId: string;
}

export function SharePanel({ sod, claimBadgeId }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const payUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/pay/${sod.id}`
      : `/pay/${sod.id}`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Success Badge Banner */}
      <div className="rounded-xl border border-[#1F7A4D]/20 bg-[#1F7A4D]/10 p-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1F7A4D] text-white mb-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111111]">Sod Created Successfully</h3>
        <p className="mt-1 text-xs text-[#5C5C5C]">
          Share this link with your payer. The amount will remain completely private.
        </p>
      </div>

      {/* Share Link Box */}
      <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5C5C]">
          Private Payment Link
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={payUrl}
            className="flex-1 rounded-lg border border-[#E5E5E2] bg-white px-3 py-2 text-sm text-[#111111] font-mono select-all focus:outline-none"
          />
          <Button onClick={handleCopy} size="sm" className="whitespace-nowrap px-4 font-semibold">
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      {/* QR Code Placeholder / Visual */}
      <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#E5E5E2] rounded-xl text-center">
        <div className="h-40 w-40 bg-[#F7F7F5] border border-[#E5E5E2] rounded-lg p-2 flex flex-col items-center justify-center mb-3">
          {/* Stylized QR Code Visual Pattern */}
          <div className="grid grid-cols-5 gap-1.5 p-2 bg-white rounded border border-[#E5E5E2]">
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#E8C547]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
            <div className="h-5 w-5 bg-white" />
            <div className="h-5 w-5 bg-[#0B1D33]" />
          </div>
          <span className="text-[10px] text-[#5C5C5C] mt-1 font-mono">Scan to Pay</span>
        </div>
        <p className="text-xs text-[#5C5C5C]">
          Payer can scan this QR code or click your payment link.
        </p>
      </div>

      {/* Summary Metadata */}
      <div className="rounded-xl border border-[#E5E5E2] bg-white p-4 divide-y divide-[#E5E5E2] text-xs">
        <div className="py-2 flex justify-between">
          <span className="text-[#5C5C5C]">Component Address:</span>
          <span className="font-mono text-[#111111] font-medium">{sod.id}</span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-[#5C5C5C]">Claim Badge ID:</span>
          <span className="font-mono text-[#111111] font-medium">{claimBadgeId}</span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-[#5C5C5C]">Amount:</span>
          <span className="font-medium text-[#111111]">
            {sod.amount ? `${sod.amount} TARI` : "Open (Payer specifies)"}
          </span>
        </div>
        <div className="py-2 flex justify-between">
          <span className="text-[#5C5C5C]">Status:</span>
          <span className="font-semibold text-[#1F7A4D]">{sod.status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/app/s/${sod.id}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            View Sod Details
          </Button>
        </Link>
        <Link href="/app" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to My Sods
          </Button>
        </Link>
      </div>
    </div>
  );
}
