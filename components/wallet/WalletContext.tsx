"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { APP_CONFIG } from "@/lib/constants";
import { ConnectPrompt } from "./ConnectPrompt";

interface WalletContextValue {
  address: string | null;
  isConnected: boolean;
  network: string;
  connect: (address: string) => void;
  disconnect: () => void;
  promptConnect: (actionName: string, onConnected?: (address: string) => void) => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("continue");
  const [onConnectedCallback, setOnConnectedCallback] = useState<((addr: string) => void) | null>(null);

  // Invariant (R-07, R-09): We do NOT automatically connect wallet on mount/page load.
  // We only load existing stored address if explicitly previously connected by user.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sod_user_address");
      if (stored) {
        setAddress(stored);
      }
    }
  }, []);

  const connect = useCallback((addr: string) => {
    setAddress(addr);
    if (typeof window !== "undefined") {
      localStorage.setItem("sod_user_address", addr);
    }
    if (onConnectedCallback) {
      onConnectedCallback(addr);
      setOnConnectedCallback(null);
    }
  }, [onConnectedCallback]);

  const disconnect = useCallback(() => {
    setAddress(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sod_user_address");
    }
  }, []);

  const promptConnect = useCallback((actionName: string, onConnected?: (addr: string) => void) => {
    setPromptAction(actionName);
    if (onConnected) {
      setOnConnectedCallback(() => onConnected);
    }
    setIsPromptOpen(true);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        network: APP_CONFIG.DEFAULT_NETWORK,
        connect,
        disconnect,
        promptConnect,
      }}
    >
      {children}
      <ConnectPrompt
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onConnect={connect}
        actionName={promptAction}
      />
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
