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
      className={`inline-flex items-center gap-2 tracking-tight select-none group ${className}`}
      aria-label="Sod Pay Home"
    >
      {showMark && (
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#0B1D33] shadow-sm transition-transform group-hover:scale-105">
          {/* Yellow accent mark shield (#E8C547) */}
          <svg
            className="h-4.5 w-4.5 text-[#E8C547]"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L20 5.5V12.5C20 17.5 12 21.5 12 21.5C12 21.5 4 17.5 4 12.5V5.5L12 2Z" />
            <circle cx="12" cy="11.5" r="2.5" fill="#0B1D33" />
          </svg>
        </span>
      )}
      <span className="text-2xl font-extrabold flex items-center">
        <span className="text-[#0B1D33]">Sod</span>
        <span className="text-[#111111]">Pay</span>
      </span>
    </Link>
  );
}
