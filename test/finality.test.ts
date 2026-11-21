import { describe, it, expect } from "vitest";
import { waitForCommitted } from "../lib/tari/finality";

describe("waitForCommitted helper (T-30, R-07)", () => {
  it("resolves immediately when checkFn returns result on first call", async () => {
    const data = { id: "sod_123", status: "Paid" };
    const res = await waitForCommitted(async () => data, {
      timeoutMs: 1000,
      pollIntervalMs: 50,
    });
    expect(res).toEqual(data);
  });

  it("polls until checkFn returns truthy result", async () => {
    let callCount = 0;
    const res = await waitForCommitted(
      async () => {
        callCount++;
        if (callCount < 3) return null;
        return { status: "Committed", count: callCount };
      },
      { timeoutMs: 1000, pollIntervalMs: 30 }
    );
    expect(res.status).toBe("Committed");
    expect(callCount).toBe(3);
  });

  it("handles transient errors during polling until success", async () => {
    let callCount = 0;
    const res = await waitForCommitted(
      async () => {
        callCount++;
        if (callCount < 2) throw new Error("Transient network error");
        return "Recovered";
      },
      { timeoutMs: 1000, pollIntervalMs: 20 }
    );
    expect(res).toBe("Recovered");
  });

  it("throws timeout error when checkFn does not resolve within timeoutMs", async () => {
    await expect(
      waitForCommitted(async () => null, {
        timeoutMs: 100,
        pollIntervalMs: 20,
      })
    ).rejects.toThrow(/Transaction finality timeout after 100ms/);
  });
});
