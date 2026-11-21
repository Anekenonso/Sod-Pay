import { TariSodClient } from "./types";
import { RealTariSodClient } from "./real";
import { APP_CONFIG } from "../constants";

let cachedRealClient: RealTariSodClient | null = null;

/**
 * Returns the singleton real Tari client instance.
 */
export function getRealClient(): RealTariSodClient {
  if (!cachedRealClient) {
    cachedRealClient = new RealTariSodClient();
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
