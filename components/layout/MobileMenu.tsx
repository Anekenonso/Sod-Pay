"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="md:hidden border-b border-[#E5E5E2] bg-white px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
      <nav className="flex flex-col space-y-1">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium text-[#111111] hover:bg-[#F7F7F5]"
        >
          Home
        </Link>
        <Link
          href="/#how-it-works"
          onClick={onClose}
          className="flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium text-[#5C5C5C] hover:bg-[#F7F7F5] hover:text-[#111111]"
        >
          How it works
        </Link>
        <Link
          href="/#faq"
          onClick={onClose}
          className="flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium text-[#5C5C5C] hover:bg-[#F7F7F5] hover:text-[#111111]"
        >
          FAQ
        </Link>
        <Link
          href="/app"
          onClick={onClose}
          className="flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium text-[#5C5C5C] hover:bg-[#F7F7F5] hover:text-[#111111]"
        >
          My Sods
        </Link>
        <a
          href="https://github.com/Anekenonso/Sod-Pay"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium text-[#5C5C5C] hover:bg-[#F7F7F5] hover:text-[#111111]"
        >
          GitHub ↗
        </a>
      </nav>

      <div className="pt-2 flex flex-col gap-2.5">
        <Link href="/app/create" onClick={onClose} className="w-full">
          <Button size="lg" className="w-full min-h-[44px] justify-center text-sm font-semibold shadow-sm">
            Create a Sod
          </Button>
        </Link>
        <Link href="/app" onClick={onClose} className="w-full">
          <Button variant="outline" size="lg" className="w-full min-h-[44px] justify-center text-sm font-semibold">
            Open Sod
          </Button>
        </Link>
      </div>
    </div>
  );
}
