"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { MobileMenu } from "./MobileMenu";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E5E2] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Wordmark logo with emblem & Mainnet badge */}
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold border border-slate-200 bg-slate-100 text-[#5C5C5C] select-none">
            Mainnet
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-[#5C5C5C] transition-colors hover:text-[#111111]"
          >
            How it works
          </Link>
          <Link
            href="/#faq"
            className="text-sm font-medium text-[#5C5C5C] transition-colors hover:text-[#111111]"
          >
            FAQ
          </Link>
          <Link
            href="/app"
            className="text-sm font-medium text-[#5C5C5C] transition-colors hover:text-[#111111]"
          >
            My Sods
          </Link>
          <a
            href="https://github.com/Anekenonso/Sod-Pay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#5C5C5C] transition-colors hover:text-[#111111]"
          >
            GitHub
          </a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <ConnectButton />
          <Link href="/app">
            <Button variant="outline" size="sm">
              Open Sod
            </Button>
          </Link>
          <Link href="/app/create">
            <Button size="sm">Create a Sod</Button>
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ConnectButton />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E2] p-1 text-[#111111] hover:bg-[#F7F7F5]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
}
