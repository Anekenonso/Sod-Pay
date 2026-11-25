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
      className={`inline-flex items-center gap-2.5 tracking-tight select-none ${className}`}
      aria-label="Sod Pay Home"
    >
      {showMark && (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B1D33] border border-[#111111]/10">
          {/* Split-Seal Mark: two interlocking seal halves framing a center key-slot */}
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 4.5C7.13 4.5 4 7.63 4 11.5C4 14.32 5.67 16.75 8.08 17.85V13.85C6.84 13.06 6 11.67 6 10.1C6 7.84 7.84 6 10.1 6H11V4.5Z"
              fill="#F7F7F5"
            />
            <path
              d="M13 19.5C16.87 19.5 20 16.37 20 12.5C20 9.68 18.33 7.25 15.92 6.15V10.15C17.16 10.94 18 12.33 18 13.9C18 16.16 16.16 18 13.9 18H13V19.5Z"
              fill="#E8C547"
            />
            <rect x="10.25" y="8.5" width="3.5" height="7" rx="1.75" fill="#E8C547" />
          </svg>
        </span>
      )}
      <span className="text-lg font-semibold tracking-tight text-[#111111]">
        Sod Pay
      </span>
    </Link>
  );
}
