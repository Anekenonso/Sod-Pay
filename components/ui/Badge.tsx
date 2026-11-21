import React from "react";
import { SodStatus } from "@/lib/sod";

interface BadgeProps {
  status: SodStatus | string;
  className?: string;
}

export function Badge({ status, className = "" }: BadgeProps) {
  const getStyles = (st: string) => {
    switch (st) {
      case "Created":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Paid":
        return "bg-[#1F7A4D]/10 text-[#1F7A4D] border-[#1F7A4D]/30";
      case "Claimed":
        return "bg-[#0B1D33]/10 text-[#0B1D33] border-[#0B1D33]/30";
      case "Revealed":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "Cancelled":
        return "bg-[#B33A3A]/10 text-[#B33A3A] border-[#B33A3A]/30";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles(
        status
      )} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Paid"
            ? "bg-[#1F7A4D]"
            : status === "Created"
            ? "bg-amber-500"
            : status === "Cancelled"
            ? "bg-[#B33A3A]"
            : "bg-[#0B1D33]"
        }`}
      />
      {status}
    </span>
  );
}
