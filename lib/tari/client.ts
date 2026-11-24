import type { Signer } from "@tari-project/ootle";
import { TariSodClient } from "./types";
import { RealTariSodClient } from "./real";
import { APP_CONFIG } from "../constants";

let cachedRealClient: RealTariSodClient | null = null;
let currentGlobalSigner: Signer | null = null;

/**
 * Sets the active signer instance on the global client.
 */
export function setGlobalSigner(signer: Signer | null) {
  currentGlobalSigner = signer;
  if (cachedRealClient) {
    cachedRealClient.setSigner(signer);
  }
}

/**
 * Gets the current active signer instance, if any.
 */
export function getGlobalSigner(): Signer | null {
  return currentGlobalSigner;
}

/**
 * Returns the singleton real Tari client instance.
 */
export function getRealClient(): RealTariSodClient {
  if (!cachedRealClient) {
    cachedRealClient = new RealTariSodClient();
    if (currentGlobalSigner) {
      cachedRealClient.setSigner(currentGlobalSigner);
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
