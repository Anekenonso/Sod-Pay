"use client";

import { useWallet } from "./WalletContext";

export function ConnectButton() {
  const { address, isConnected, walletType, walletName, disconnect } = useWallet();

  // Non-negotiable: No "Connect Wallet" button on navbar/homepage.
  // Connect is triggered only on action flows (Create, Pay, Claim, etc.).
  // Only render a small truncated address and status badge once connected.
  if (!isConnected || !address) {
    return null;
  }

  const truncated =
    address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

  const typeLabel =
    walletName ||
    (walletType === "extension" || walletType === "sapient"
      ? "Extension"
      : walletType === "daemon"
        ? "Daemon"
        : "View");

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E5E2] bg-white text-xs font-mono shadow-sm">
        <span
          className={`h-1.5 w-1.5 rounded-full ${walletType === "manual" ? "bg-amber-500" : "bg-[#1F7A4D]"
            }`}
        />
        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#5C5C5C] border-r border-[#E5E5E2] pr-1.5 mr-0.5">
          {typeLabel}
        </span>
        <span className="text-[#111111]">{truncated}</span>
      </div>
      <button
        type="button"
        onClick={disconnect}
        className="text-xs text-[#5C5C5C] hover:text-[#B33A3A] transition-colors p-1"
        title="Disconnect wallet"
        aria-label="Disconnect wallet"
      >
        ✕
      </button>
    </div>
  );
}
