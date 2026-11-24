import type { Signer } from "@tari-project/ootle";
import { TariSodClient } from "./types";
import { RealTariSodClient } from "./real";
import { APP_CONFIG } from "../constants";
import type { WalletType, TariExtensionProvider } from "./wallet";

export interface ActiveWalletSession {
  address: string;
  type: WalletType;
  walletName?: string;
  signer?: Signer | null;
  provider?: TariExtensionProvider | null;
}

let cachedRealClient: RealTariSodClient | null = null;
let currentActiveSession: ActiveWalletSession | null = null;

/**
 * Sets the active wallet session on the global client.
 */
export function setActiveWalletSession(session: ActiveWalletSession | null) {
  currentActiveSession = session;
  if (cachedRealClient) {
    cachedRealClient.setActiveSession(session);
  }
}

/**
 * Gets the active wallet session, if any.
 */
export function getActiveWalletSession(): ActiveWalletSession | null {
  return currentActiveSession;
}

/**
 * Sets the active signer instance on the global client (daemon / compatibility).
 */
export function setGlobalSigner(signer: Signer | null) {
  if (signer) {
    setActiveWalletSession({
      address: "",
      type: "daemon",
      walletName: "Daemon",
      signer,
    });
  } else {
    setActiveWalletSession(null);
  }
}

/**
 * Gets the current active signer instance, if any (daemon / compatibility).
 */
export function getGlobalSigner(): Signer | null {
  return currentActiveSession?.signer || null;
}

/**
 * Returns the singleton real Tari client instance.
 */
export function getRealClient(): RealTariSodClient {
  if (!cachedRealClient) {
    cachedRealClient = new RealTariSodClient();
    if (currentActiveSession) {
      cachedRealClient.setActiveSession(currentActiveSession);
    }
  }
  return cachedRealClient;
}

/**
 * Factory for TariSodClient.
 * Always returns the real on-chain client (mode: "REAL").
 */
export function getTariSodClient(): TariSodClient {
  return getRealClient();
}

export interface WalletSession {
  address: string | null;
  network: string;
  isConnected: boolean;
}

export function createInitialWalletSession(): WalletSession {
  return {
    address: null,
    network: APP_CONFIG.DEFAULT_NETWORK,
    isConnected: false,
  };
}
