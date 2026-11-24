"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Signer } from "@tari-project/ootle";
import { APP_CONFIG } from "@/lib/constants";
import { ConnectPrompt } from "./ConnectPrompt";
import {
  WalletType,
  connectSapientExtension,
  connectWalletDaemon,
  isSapientAvailable,
} from "@/lib/tari/wallet";
import { setGlobalSigner } from "@/lib/tari/client";

interface WalletContextValue {
  address: string | null;
  walletType: WalletType | null;
  signer: Signer | null;
  isConnected: boolean;
  network: string;
  hasExtension: boolean;
  connectExtension: () => Promise<string>;
  connectDaemon: (url?: string) => Promise<string>;
  connectManual: (address: string) => void;
  disconnect: () => void;
  promptConnect: (actionName: string, onConnected?: (address: string) => void) => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [hasExtension, setHasExtension] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("continue");
  const [onConnectedCallback, setOnConnectedCallback] = useState<((addr: string) => void) | null>(null);

  // Check for Sapient extension availability on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasExtension(isSapientAvailable());
      // Re-check after window loads in case extension takes a few ms to inject
      const timer = setTimeout(() => {
        setHasExtension(isSapientAvailable());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConnected = useCallback(
    (addr: string, type: WalletType, activeSigner?: Signer) => {
      setAddress(addr);
      setWalletType(type);
      if (activeSigner) {
        setSigner(activeSigner);
        setGlobalSigner(activeSigner);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("sod_user_address", addr);
        localStorage.setItem("sod_wallet_type", type);
      }
      if (onConnectedCallback) {
        onConnectedCallback(addr);
        setOnConnectedCallback(null);
      }
    },
    [onConnectedCallback]
  );

  const connectExtension = useCallback(async (): Promise<string> => {
    const res = await connectSapientExtension();
    handleConnected(res.address, "sapient", res.signer);
    return res.address;
  }, [handleConnected]);

  const connectDaemon = useCallback(
    async (url?: string): Promise<string> => {
      const res = await connectWalletDaemon(url);
      handleConnected(res.address, "daemon", res.signer);
      return res.address;
    },
    [handleConnected]
  );

  const connectManual = useCallback(
    (addr: string) => {
      handleConnected(addr, "manual");
    },
    [handleConnected]
  );

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletType(null);
    setSigner(null);
    setGlobalSigner(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sod_user_address");
      localStorage.removeItem("sod_wallet_type");
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
        walletType,
        signer,
        isConnected: Boolean(address && (signer || walletType)),
        network: APP_CONFIG.DEFAULT_NETWORK,
        hasExtension,
        connectExtension,
        connectDaemon,
        connectManual,
        disconnect,
        promptConnect,
      }}
    >
      {children}
      <ConnectPrompt
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
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
