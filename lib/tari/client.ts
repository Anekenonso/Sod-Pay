import { TariSodClient } from "./types";
import { SimTariSodClient } from "./sod";
import { RealTariSodClient } from "./real";
import { APP_CONFIG } from "../constants";

let cachedSimClient: SimTariSodClient | null = null;
let cachedRealClient: RealTariSodClient | null = null;

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
 * In demo mode: returns simulated client (mode: "SIMULATED").
 * In non-demo (mainnet default): returns real client (mode: "REAL").
 */
export function getTariSodClient(isDemo: boolean): TariSodClient {
  if (isDemo) {
    return getSimClient();
  }
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
