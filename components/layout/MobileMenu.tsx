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
    <div className="md:hidden border-b border-[#E5E5E2] bg-white px-4 pt-2 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
      <nav className="flex flex-col space-y-3">
        <Link
          href="/"
          onClick={onClose}
          className="text-base font-medium text-[#111111] hover:text-[#0B1D33]"
        >
          Home
        </Link>
        <Link
          href="/#how-it-works"
          onClick={onClose}
          className="text-base font-medium text-[#5C5C5C] hover:text-[#111111]"
        >
          How it works
        </Link>
        <Link
          href="/#faq"
          onClick={onClose}
          className="text-base font-medium text-[#5C5C5C] hover:text-[#111111]"
        >
          FAQ
        </Link>
        <Link
          href="/app"
          onClick={onClose}
          className="text-base font-medium text-[#5C5C5C] hover:text-[#111111]"
        >
          My Sods
        </Link>
        <a
          href="https://github.com/Anekenonso/Sod-Pay"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="text-base font-medium text-[#5C5C5C] hover:text-[#111111]"
        >
          GitHub
        </a>
      </nav>

      <div className="pt-2 flex flex-col gap-2">
        <Link href="/app/create" onClick={onClose} className="w-full">
          <Button className="w-full">Create a Sod</Button>
        </Link>
        <Link href="/app" onClick={onClose} className="w-full">
          <Button variant="outline" className="w-full">
            Open Sod
          </Button>
        </Link>
      </div>
    </div>
  );
}
