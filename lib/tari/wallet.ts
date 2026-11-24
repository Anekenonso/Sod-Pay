import type { Signer } from "@tari-project/ootle";
import type { WalletDaemonSigner } from "@tari-project/ootle-wallet-daemon-signer";
import { APP_CONFIG } from "../constants";

export type WalletType = "sapient" | "daemon" | "manual";

export interface ConnectedWallet {
  address: string;
  type: WalletType;
  signer?: Signer;
  publicKey?: Uint8Array;
}

/**
 * Checks whether the Sapient or official Tari browser extension is injected in the window.
 */
export function isSapientAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as unknown as { tari?: unknown }).tari !== "undefined";
}

/**
 * Connects to the Sapient browser wallet extension.
 */
export async function connectSapientExtension(): Promise<ConnectedWallet> {
  if (typeof window === "undefined" || !isSapientAvailable()) {
    throw new Error(
      "Sapient wallet extension not detected. Please install the extension or use the local wallet daemon."
    );
  }

  const tari = (window as unknown as { tari: any }).tari;

  let address: string | null = null;
  let publicKey: Uint8Array | undefined = undefined;

  try {
    if (typeof tari.request === "function") {
      const accounts: string[] = await tari.request({ method: "tari_requestAccounts" });
      if (accounts && accounts.length > 0) {
        address = accounts[0];
      }
    } else if (typeof tari.connect === "function") {
      const res = await tari.connect();
      address = res?.address || (res?.accounts && res.accounts[0]) || null;
    } else if (typeof tari.getAccount === "function") {
      address = await tari.getAccount();
    } else if (typeof tari.getAddress === "function") {
      address = await tari.getAddress();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to connect Sapient extension: ${msg}`);
  }

  if (!address) {
    throw new Error("No account address returned from Sapient wallet.");
  }

  // Create or wrap signer
  let signer: Signer;
  if (typeof tari.signTransaction === "function" && typeof tari.getPublicKey === "function") {
    signer = tari as Signer;
    try {
      publicKey = await signer.getPublicKey();
    } catch {
      // Ignore if public key cannot be retrieved eagerly
    }
  } else {
    // Custom wrapper around window.tari
    signer = {
      getAddress: async () => address!,
      getPublicKey: async () => {
        if (publicKey) return publicKey;
        if (typeof tari.getPublicKey === "function") {
          return await tari.getPublicKey();
        }
        return new Uint8Array(32);
      },
      signTransaction: async (unsignedTx, sealPublicKey, authorizers) => {
        if (typeof tari.signTransaction === "function") {
          return await tari.signTransaction(unsignedTx, sealPublicKey, authorizers);
        }
        if (typeof tari.request === "function") {
          return await tari.request({
            method: "tari_signTransaction",
            params: { unsignedTx, sealPublicKey, authorizers },
          });
        }
        throw new Error("Sapient extension does not support transaction signing.");
      },
    };
  }

  return {
    address,
    type: "sapient",
    signer,
    publicKey,
  };
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
