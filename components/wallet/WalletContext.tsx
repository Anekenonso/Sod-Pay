"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Signer } from "@tari-project/ootle";
import { APP_CONFIG } from "@/lib/constants";
import { ConnectPrompt } from "./ConnectPrompt";
import {
  WalletType,
  DetectedExtension,
  TariExtensionProvider,
  getInjectedExtensions,
  connectExtension as tariConnectExtension,
  connectWalletDaemon,
} from "@/lib/tari/wallet";
import { setActiveWalletSession } from "@/lib/tari/client";

interface WalletContextValue {
  address: string | null;
  walletType: WalletType | null;
  walletName: string | null;
  signer: Signer | null;
  extensionProvider: TariExtensionProvider | null;
  isConnected: boolean;
  network: string;
  hasExtension: boolean;
  detectedExtensions: DetectedExtension[];
  connectExtension: (provider?: TariExtensionProvider) => Promise<string>;
  connectDaemon: (url?: string) => Promise<string>;
  connectManual: (address: string) => void;
  disconnect: () => void;
  promptConnect: (actionName: string, onConnected?: (address: string) => void) => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [extensionProvider, setExtensionProvider] = useState<TariExtensionProvider | null>(null);
  const [hasExtension, setHasExtension] = useState(false);
  const [detectedExtensions, setDetectedExtensions] = useState<DetectedExtension[]>([]);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("continue");
  const [onConnectedCallback, setOnConnectedCallback] = useState<((addr: string) => void) | null>(null);

  // Check for extension availability on mount and detect providers dynamically
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateDetected = () => {
        const exts = getInjectedExtensions();
        setDetectedExtensions(exts);
        setHasExtension(exts.length > 0);
      };

      updateDetected();
      const t1 = setTimeout(updateDetected, 200);
      const t2 = setTimeout(updateDetected, 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, []);

  const handleConnected = useCallback(
    (
      addr: string,
      type: WalletType,
      name: string,
      activeSigner?: Signer | null,
      provider?: TariExtensionProvider | null
    ) => {
      setAddress(addr);
      setWalletType(type);
      setWalletName(name);
      setSigner(activeSigner || null);
      setExtensionProvider(provider || null);

      setActiveWalletSession({
        address: addr,
        type,
        walletName: name,
        signer: activeSigner || null,
        provider: provider || null,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("sod_user_address", addr);
        localStorage.setItem("sod_wallet_type", type);
        localStorage.setItem("sod_wallet_name", name);
      }

      if (onConnectedCallback) {
        onConnectedCallback(addr);
        setOnConnectedCallback(null);
      }
    },
    [onConnectedCallback]
  );

  const connectExtension = useCallback(
    async (provider?: TariExtensionProvider): Promise<string> => {
      const res = await tariConnectExtension(provider);
      handleConnected(res.address, res.type, res.walletName, null, res.provider);
      return res.address;
    },
    [handleConnected]
  );

  const connectDaemon = useCallback(
    async (url?: string): Promise<string> => {
      const res = await connectWalletDaemon(url);
      handleConnected(res.address, res.type, res.walletName, res.signer, null);
      return res.address;
    },
    [handleConnected]
  );

  const connectManual = useCallback(
    (addr: string) => {
      handleConnected(addr, "manual", "View-Only", null, null);
    },
    [handleConnected]
  );

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletType(null);
    setWalletName(null);
    setSigner(null);
    setExtensionProvider(null);
    setActiveWalletSession(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sod_user_address");
      localStorage.removeItem("sod_wallet_type");
      localStorage.removeItem("sod_wallet_name");
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
        walletName,
        signer,
        extensionProvider,
        isConnected: Boolean(address && walletType),
        network: APP_CONFIG.DEFAULT_NETWORK,
        hasExtension,
        detectedExtensions,
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
