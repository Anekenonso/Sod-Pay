"use client";

import { useWallet } from "./WalletContext";
import { Button } from "@/components/ui/Button";

export function ConnectButton() {
  const { address, isConnected, promptConnect, disconnect } = useWallet();

  if (!isConnected || !address) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => promptConnect("connect")}
      >
        Connect Wallet
      </Button>
    );
  }

  const truncated =
    address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E5E5E2] bg-white text-xs font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A4D]" />
        <span>{truncated}</span>
      </div>
      <button
        type="button"
        onClick={disconnect}
        className="text-xs text-[#B33A3A] hover:underline"
        title="Disconnect wallet"
      >
        ✕
      </button>
    </div>
  );
}
