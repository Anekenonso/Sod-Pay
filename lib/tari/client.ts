import { TariSodClient } from "./types";
import { SimTariSodClient } from "./sod";
import { APP_CONFIG } from "../constants";

let cachedSimClient: SimTariSodClient | null = null;

/**
 * Returns the singleton simulated client instance for the session.
 */
export function getSimClient(): SimTariSodClient {
  if (!cachedSimClient) {
    cachedSimClient = new SimTariSodClient();
  }
  return cachedSimClient;
}

/**
 * Factory for TariSodClient.
 * In demo mode: returns simulated client.
 * In non-demo: returns real client (or simulated fallback if real SDK not connected yet).
 */
export function getTariSodClient(isDemo: boolean): TariSodClient {
  if (isDemo) {
    return getSimClient();
  }
  // Real client shell will be hooked in T-17/T-19
  return getSimClient();
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
