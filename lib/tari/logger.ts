export type ClientMode = "REAL" | "SIMULATED" | "TESTNET" | "DRY RUN";

export interface LogEntry {
  requestId: string;
  action: string;
  sodId: string | null;
  txId: string | null;
  mode: ClientMode;
  result: "SUCCESS" | "FAILED";
  error?: string;
  timestamp: number;
}

export function logAction(entry: Omit<LogEntry, "requestId" | "timestamp">): LogEntry {
  const fullEntry: LogEntry = {
    requestId: `req_${Math.random().toString(36).substring(2, 10)}`,
    timestamp: Date.now(),
    ...entry,
  };

  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[${fullEntry.mode}] ${fullEntry.action} sod=${fullEntry.sodId} tx=${fullEntry.txId} result=${fullEntry.result}`
    );
  }

  return fullEntry;
}
