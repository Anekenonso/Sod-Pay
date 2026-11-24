import type { Signer } from "@tari-project/ootle";
import type { WalletDaemonSigner } from "@tari-project/ootle-wallet-daemon-signer";
import { APP_CONFIG } from "../constants";

export type WalletType = "extension" | "daemon" | "manual" | "sapient";

export interface TariProviderRequestArgs {
  method: string;
  params?: unknown;
}

export interface TariExtensionProvider {
  request?: (args: TariProviderRequestArgs) => Promise<unknown>;
  signAndSubmitTransaction?: (params: unknown) => Promise<unknown>;
  connect?: () => Promise<any>;
  getAccount?: () => Promise<string>;
  getAddress?: () => Promise<string>;
  name?: string;
  isSapient?: boolean;
  [key: string]: unknown;
}

export interface DetectedExtension {
  id: string;
  name: string;
  provider: TariExtensionProvider;
}

export interface ConnectedWallet {
  address: string;
  type: WalletType;
  walletName: string;
  signer?: Signer; // For daemon
  provider?: TariExtensionProvider; // For extension
  publicKey?: Uint8Array;
}

/**
 * Discovers any injected Tari-compatible browser extensions (Sapient, etc.).
 * Does not hard-code Sapient as the only extension.
 */
export function getInjectedExtensions(): DetectedExtension[] {
  if (typeof window === "undefined") return [];
  const list: DetectedExtension[] = [];
  const win = window as unknown as Record<string, unknown>;

  if (win.tari && typeof win.tari === "object") {
    const tari = win.tari as TariExtensionProvider;
    const name = tari.name || (tari.isSapient ? "Sapient" : "Tari Extension");
    list.push({
      id: "tari",
      name,
      provider: tari,
    });
  }

  if (win.tariProvider && typeof win.tariProvider === "object" && win.tariProvider !== win.tari) {
    const tp = win.tariProvider as TariExtensionProvider;
    list.push({
      id: "tariProvider",
      name: tp.name || "Tari Provider",
      provider: tp,
    });
  }

  if (win.ootle && typeof win.ootle === "object" && win.ootle !== win.tari) {
    const ootle = win.ootle as TariExtensionProvider;
    list.push({
      id: "ootle",
      name: ootle.name || "Ootle Wallet",
      provider: ootle,
    });
  }

  return list;
}

/**
 * Checks whether any compatible Tari browser extension is injected.
 */
export function isExtensionAvailable(): boolean {
  return getInjectedExtensions().length > 0;
}

/**
 * Backwards compatibility helper for extension check.
 */
export function isSapientAvailable(): boolean {
  return isExtensionAvailable();
}

/**
 * Connects to a detected browser wallet extension.
 * Defaults to the first injected extension (e.g. Sapient).
 */
export async function connectExtension(
  selectedProvider?: TariExtensionProvider
): Promise<ConnectedWallet> {
  const extensions = getInjectedExtensions();
  const provider = selectedProvider || (extensions.length > 0 ? extensions[0].provider : null);

  if (!provider) {
    throw new Error(
      "No Tari browser extension detected. Please install Sapient or another compatible Tari extension, or connect via local wallet daemon."
    );
  }

  const walletName = provider.name || (provider.isSapient ? "Sapient" : "Tari Extension");
  let address: string | null = null;

  try {
    if (typeof provider.request === "function") {
      const accounts = await provider.request({ method: "tari_requestAccounts" });
      if (Array.isArray(accounts) && accounts.length > 0) {
        address = accounts[0];
      } else if (typeof accounts === "string") {
        address = accounts;
      }
    }
    if (!address && typeof provider.connect === "function") {
      const res = await provider.connect();
      address = res?.address || (res?.accounts && res.accounts[0]) || null;
    }
    if (!address && typeof provider.getAccount === "function") {
      address = await provider.getAccount();
    }
    if (!address && typeof provider.getAddress === "function") {
      address = await provider.getAddress();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to connect ${walletName}: ${msg}`);
  }

  if (!address) {
    throw new Error(`No account address returned from ${walletName}.`);
  }

  return {
    address,
    type: "extension",
    walletName,
    provider,
  };
}

/**
 * Alias for connectExtension for backwards compatibility.
 */
export async function connectSapientExtension(): Promise<ConnectedWallet> {
  return connectExtension();
}

/**
 * Connects to the local Tari wallet daemon via @tari-project/ootle-wallet-daemon-signer.
 */
export async function connectWalletDaemon(
  url: string = APP_CONFIG.WALLET_DAEMON_URL,
  authToken?: string
): Promise<ConnectedWallet> {
  const { WalletDaemonSigner } = await import("@tari-project/ootle-wallet-daemon-signer");

  try {
    const signer: WalletDaemonSigner = await WalletDaemonSigner.connect({
      url,
      authToken: authToken || process.env.NEXT_PUBLIC_WALLET_DAEMON_AUTH_TOKEN || undefined,
    });

    const address = await signer.getAddress();
    let publicKey: Uint8Array | undefined = undefined;
    try {
      publicKey = await signer.getPublicKey();
    } catch {
      // Optional eager public key resolution
    }

    return {
      address,
      type: "daemon",
      walletName: "Wallet Daemon",
      signer,
      publicKey,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not connect to Tari wallet daemon at ${url}. Ensure tari_ootle_walletd is running and JSON-RPC is enabled: ${msg}`
    );
  }
}
