import { describe, it, expect } from "vitest";
import { GET } from "../app/api/health/route";

describe("health route", () => {
  it("returns ok: true", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(res.status).toBe(200);
  });
});
