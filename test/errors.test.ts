import { describe, it, expect, vi } from "vitest";
import { formatFriendlyError } from "../lib/errors";

describe("P0 - Friendly errors and structured developer logging", () => {
  it("maps InsufficientFeesPaid / WASM metering errors to calm fee copy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error(
      "InsufficientFeesPaid: At instruction #1: consumed ~30275 WASM metering points, which exceeds what the paid fees cover. Increase the transaction fee. (fee on tx was 2000)"
    );

    const result = formatFriendlyError(err, {
      action: "createSod",
      walletType: "extension",
      detail: { code: 4001 },
    });

    expect(result.userMessage).toBe("This action needs a higher network fee. Please try again.");
    expect(result.rawMessage).toContain("InsufficientFeesPaid");
    expect(spy).toHaveBeenCalledWith(
      "[Sod Pay]",
      expect.objectContaining({
        action: "createSod",
        walletType: "extension",
        userMessage: "This action needs a higher network fee. Please try again.",
      })
    );

    spy.mockRestore();
  });

  it("maps wallet rejected / user denied errors to actionable wallet copy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("Extension rejected or failed to sign and submit: User rejected transaction in extension");

    const result = formatFriendlyError(err, {
      action: "createSod",
      walletType: "extension",
    });

    expect(result.userMessage).toBe(
      "Your wallet couldn’t approve this action. Check the wallet popup or try reconnecting."
    );

    spy.mockRestore();
  });

  it("maps insufficient balance errors accurately without jargon", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("Account has insufficient balance to transfer 100 TARI");

    const result = formatFriendlyError(err, {
      action: "pay",
      walletType: "extension",
    });

    expect(result.userMessage).toBe("Not enough balance to complete this action.");

    spy.mockRestore();
  });

  it("maps payload / unsupported method errors cleanly", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error(
      "JSON deserialization failed: missing field TransactionInput or inputs=0 in unsigned tx"
    );

    const result = formatFriendlyError(err, {
      action: "createSod",
      walletType: "extension",
    });

    expect(result.userMessage).toBe(
      "Your wallet couldn’t process this request. Please try again or reconnect."
    );

    spy.mockRestore();
  });

  it("preserves readable business validations and provides safe fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const errValidation = new Error("Wrong amount: expected 50 TARI, received 40 TARI");
    const resValidation = formatFriendlyError(errValidation, { action: "pay" });
    expect(resValidation.userMessage).toBe("Wrong amount: expected 50 TARI, received 40 TARI");

    const errUnknown = new Error("Random unexpected crash 0x999");
    const resUnknown = formatFriendlyError(errUnknown, { action: "unknown" });
    expect(resUnknown.userMessage).toBe("Something went wrong. Please try again.");

    spy.mockRestore();
  });
});
