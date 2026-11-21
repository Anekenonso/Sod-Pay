"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ConnectPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
  actionName?: string;
  isDemo?: boolean;
}

export function ConnectPrompt({
  isOpen,
  onClose,
  onConnect,
  actionName = "continue",
  isDemo = false,
}: ConnectPromptProps) {
  const [addressInput, setAddressInput] = useState("");

  if (!isOpen) return null;

  const handleSimConnect = () => {
    const mockAddress = `tari_sim_${Math.random().toString(36).substring(2, 8)}`;
    onConnect(mockAddress);
    onClose();
  };

  const handleManualConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      onConnect(addressInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-xl space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#111111]">Connect Tari Wallet</h3>
            <button
              onClick={onClose}
              className="text-[#5C5C5C] hover:text-[#111111] p-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-[#5C5C5C]">
            A connected wallet is required to {actionName}. Sod Pay never holds your keys or funds.
          </p>
        </div>

        {isDemo ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E8C547]/30 bg-[#E8C547]/10 p-3.5 text-xs text-[#111111]">
              <span className="font-bold">SIMULATED MODE:</span> You can instantly connect a simulated Tari account to test the end-to-end flow.
            </div>
            <Button onClick={handleSimConnect} size="lg" className="w-full">
              Connect Simulated Account
            </Button>
          </div>
        ) : (
          <form onSubmit={handleManualConnect} className="space-y-4">
            <Input
              label="Tari Wallet Address / Daemon Public Key"
              placeholder="e.g. 02a1b2c3d4..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              required
              helperText="Connect to your local Tari wallet daemon"
            />
            <Button type="submit" size="lg" className="w-full">
              Connect Wallet
            </Button>
          </form>
        )}

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#5C5C5C] hover:text-[#111111]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
