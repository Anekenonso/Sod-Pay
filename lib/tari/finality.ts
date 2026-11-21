/**
 * Finality helper to wait for a transaction to be finalized/committed by the Tari indexer.
 * Handles timeouts and error states cleanly.
 */

export interface WaitForCommittedOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export async function waitForCommitted<T>(
  checkFn: () => Promise<T | null | undefined>,
  options: WaitForCommittedOptions = {}
): Promise<T> {
  const { timeoutMs = 30000, pollIntervalMs = 1500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await checkFn();
      if (result) {
        return result;
      }
    } catch {
      // Continue polling on transient errors
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Transaction finality timeout after ${timeoutMs}ms`);
}
