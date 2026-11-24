import React from "react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showMark?: boolean;
}

export function Logo({ className = "", showMark = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 tracking-tight select-none group ${className}`}
      aria-label="Sod Pay Home"
    >
      {showMark && (
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B1D33] shadow-sm transition-transform group-hover:scale-105 border border-[#0B1D33]/15">
          {/* Sealed link / vault mark in accent yellow (#E8C547) */}
          <svg
            className="h-4.5 w-4.5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Vault Shackle / Payment Link */}
            <path
              d="M8 9.5V6.5C8 4.29 9.79 2.5 12 2.5C14.21 2.5 16 4.29 16 6.5V9.5"
              stroke="#E8C547"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Confidential Vault / Link Chamber */}
            <rect
              x="5"
              y="9.5"
              width="14"
              height="11"
              rx="2.5"
              fill="#E8C547"
            />
            {/* Keyhole & Payment Cue */}
            <circle cx="12" cy="14" r="1.5" fill="#0B1D33" />
            <path
              d="M12 15V17.5"
              stroke="#0B1D33"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      <span className="text-2xl font-extrabold flex items-center">
        <span className="text-[#0B1D33]">Sod</span>
        <span className="text-[#111111]">Pay</span>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E8C547] ml-0.5 mb-2.5" />
      </span>
    </Link>
  );
}
