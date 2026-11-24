"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useWallet } from "./WalletContext";
import { APP_CONFIG } from "@/lib/constants";

interface ConnectPromptProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

export function ConnectPrompt({
  isOpen,
  onClose,
  actionName = "continue",
}: ConnectPromptProps) {
  const { hasExtension, connectExtension, connectDaemon, connectManual } = useWallet();
  const [daemonUrl, setDaemonUrl] = useState(APP_CONFIG.WALLET_DAEMON_URL);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  if (!isOpen) return null;

  const handleConnectExtension = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      await connectExtension();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to Sapient extension.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectDaemon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);
    try {
      await connectDaemon(daemonUrl.trim());
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not reach wallet daemon at ${daemonUrl}. Make sure tari_ootle_walletd is running.`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualAddress.trim()) {
      connectManual(manualAddress.trim());
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-wallet-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5E5E2] bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h3 id="connect-wallet-title" className="text-xl font-bold text-[#111111]">
              Connect Tari Wallet
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#5C5C5C] hover:bg-[#F7F7F5] hover:text-[#111111]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-[#5C5C5C] leading-relaxed">
            A signer session is required to {actionName}. Sod Pay is non-custodial: your keys and funds stay in your wallet.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#B33A3A]/20 bg-[#B33A3A]/10 p-3.5 text-xs text-[#B33A3A] leading-relaxed space-y-1.5"
          >
            <p className="font-semibold">Connection failed</p>
            <p>{error}</p>
            <div className="pt-1">
              <a
                href="https://ootle.tari.com/guides/setup-a-wallet/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-[#B33A3A]/80"
              >
                Read Tari wallet setup guide →
              </a>
            </div>
          </div>
        )}

        {/* Primary Options */}
        <div className="space-y-3">
          {/* 1. Sapient Extension */}
          <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#111111]">
                Sapient Browser Extension
              </span>
              {hasExtension ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1F7A4D] bg-[#1F7A4D]/10 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A4D]" />
                  Detected
                </span>
              ) : (
                <span className="text-[11px] text-[#5C5C5C]">Not detected</span>
              )}
            </div>

            {hasExtension ? (
              <Button
                type="button"
                onClick={handleConnectExtension}
                disabled={isConnecting}
                size="md"
                className="w-full justify-center text-sm font-semibold shadow-sm"
              >
                {isConnecting ? "Connecting…" : "Connect with Sapient"}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#5C5C5C] leading-relaxed">
                  Install the official Sapient extension to sign transactions directly in your browser.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleConnectExtension}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    Retry Detection
                  </Button>
                  <a
                    href="https://ootle.tari.com/guides/setup-a-wallet/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full rounded-lg border border-[#E5E5E2] bg-white px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F7F7F5]"
                  >
                    Install Guide ↗
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 2. Wallet Daemon */}
          <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 space-y-3">
            <div>
              <span className="font-semibold text-sm text-[#111111]">
                Local Wallet Daemon (JSON-RPC)
              </span>
              <p className="mt-0.5 text-xs text-[#5C5C5C]">
                Connect to a running <code className="font-mono text-[11px]">tari_ootle_walletd</code> instance.
              </p>
            </div>

            <form onSubmit={handleConnectDaemon} className="space-y-3">
              <Input
                label="Daemon JSON-RPC URL"
                type="text"
                value={daemonUrl}
                onChange={(e) => setDaemonUrl(e.target.value)}
                placeholder="http://127.0.0.1:9000/json_rpc"
                disabled={isConnecting}
              />
              <Button
                type="submit"
                disabled={isConnecting}
                variant="outline"
                size="md"
                className="w-full justify-center text-sm font-semibold bg-white"
              >
                {isConnecting ? "Connecting to daemon…" : "Connect Local Daemon"}
              </Button>
            </form>
          </div>
        </div>

        {/* 3. Advanced Manual Read-Only */}
        <div className="pt-2 border-t border-[#E5E5E2]">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-medium text-[#5C5C5C] hover:text-[#111111]"
          >
            <span>Advanced: View-only manual address</span>
            <span>{showAdvanced ? "▲" : "▼"}</span>
          </button>

          {showAdvanced && (
            <form onSubmit={handleManualSubmit} className="mt-3 space-y-3 animate-in fade-in">
              <p className="text-[11px] text-[#5C5C5C] leading-relaxed bg-amber-50 border border-amber-200/60 p-2.5 rounded-lg text-amber-900">
                <strong>View-only mode:</strong> Pasting an address is for display and inspection only. It cannot sign transactions on-chain.
              </p>
              <Input
                label="Manual Account Address"
                placeholder="component_... or 02..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                required
              />
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Use for Viewing
              </Button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-1">
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
