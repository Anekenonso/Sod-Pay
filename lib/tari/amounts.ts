export const TARI_DECIMALS = 6;
export const MICRO_TARI_PER_TARI = 1_000_000n;

/**
 * Converts a human-readable TARI amount (e.g. "250", "1.5") to microTARI (10^-6 TARI) base units.
 */
export function tariToMicroTari(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Please enter a valid TARI amount (got "${amount}")`);
  }

  const [wholePart, fracPart = ""] = trimmed.split(".");
  const paddedFrac = (fracPart + "000000").slice(0, TARI_DECIMALS);
  const micro = BigInt(wholePart) * MICRO_TARI_PER_TARI + BigInt(paddedFrac);
  if (micro <= 0n) {
    throw new Error("Please enter a valid positive TARI amount");
  }
  return micro;
}

/**
 * Formats microTARI base units (e.g. "250000000") into a human-readable TARI string ("250").
 */
export function formatMicroTari(
  micro: string | number | bigint | null | undefined
): string | null {
  if (micro === null || micro === undefined || micro === "") return null;

  let raw: bigint;
  try {
    raw = typeof micro === "bigint" ? micro : BigInt(String(micro).trim());
  } catch {
    return String(micro);
  }

  const whole = raw / MICRO_TARI_PER_TARI;
  const frac = raw % MICRO_TARI_PER_TARI;
  if (frac === 0n) return whole.toString();

  const fracStr = frac.toString().padStart(TARI_DECIMALS, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}
