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
        return "bg-[#E8C547]/15 text-[#7A5E0B] border-[#E8C547]/40";
      case "Paid":
        return "bg-[#1F7A4D]/10 text-[#1F7A4D] border-[#1F7A4D]/25";
      case "Claimed":
        return "bg-[#0B1D33]/8 text-[#0B1D33] border-[#0B1D33]/20";
      case "Revealed":
        return "bg-[#1F7A4D]/15 text-[#175C3A] border-[#1F7A4D]/35";
      case "Cancelled":
        return "bg-[#B33A3A]/10 text-[#B33A3A] border-[#B33A3A]/25";
      default:
        return "bg-[#EFEFEA] text-[#5C5C5C] border-[#E5E5E2]";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles(
        status
      )} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Paid" || status === "Revealed"
            ? "bg-[#1F7A4D]"
            : status === "Created"
            ? "bg-[#C9A428]"
            : status === "Cancelled"
            ? "bg-[#B33A3A]"
            : "bg-[#0B1D33]"
        }`}
      />
      {status}
    </span>
  );
}
