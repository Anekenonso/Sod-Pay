"use client";

import { useDemo } from "./DemoProvider";
import { MICROCOPY } from "@/lib/constants";

export function DemoBanner() {
  const { isDemo, toggleDemo } = useDemo();

  if (!isDemo) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-[#E8C547] text-[#111111] px-4 py-2 font-medium text-xs sm:text-sm border-b border-black/10 shadow-sm"
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#B33A3A] animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-[11px] bg-black/10 px-1.5 py-0.5 rounded">
            SIMULATED
          </span>
          <span>{MICROCOPY.DEMO_BANNER}</span>
        </div>
        <button
          type="button"
          onClick={toggleDemo}
          className="text-xs font-semibold underline hover:text-[#0B1D33] transition-colors whitespace-nowrap"
        >
          Switch to Mainnet
        </button>
      </div>
    </div>
  );
}
