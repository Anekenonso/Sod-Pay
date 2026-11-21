import { describe, it, expect } from "vitest";
import {
  Sod,
  canClaim,
  canCancel,
  canPay,
  canRequestReveal,
  canApproveReveal,
  isExpired,
} from "../lib/sod";

function mockSod(overrides: Partial<Sod> = {}): Sod {
  return {
    id: "sod_component_123",
    status: "Created",
    amount: "100",
    description: "Design work payment",
    creator: "tari_creator_111",
    claimAuthority: "badge_resource_999",
    paidAmount: null,
    expiryEpoch: 500,
    isRevealed: false,
    revealRequestedBy: null,
    createdAt: 1000,
    paidAt: null,
    claimedAt: null,
    revealedAt: null,
    ...overrides,
  };
}

describe("Sod domain flags and rules", () => {
  describe("canCancel", () => {
    it("allows creator to cancel when status is Created", () => {
      const sod = mockSod({ status: "Created" });
      expect(canCancel(sod, "tari_creator_111")).toBe(true);
    });

    it("prevents non-creator from cancelling", () => {
      const sod = mockSod({ status: "Created" });
      expect(canCancel(sod, "tari_other_222")).toBe(false);
    });

    it("prevents cancel when status is Paid (B-04)", () => {
      const sod = mockSod({ status: "Paid" });
      expect(canCancel(sod, "tari_creator_111")).toBe(false);
    });

    it("prevents cancel when status is Claimed or Cancelled", () => {
      expect(canCancel(mockSod({ status: "Claimed" }), "tari_creator_111")).toBe(false);
      expect(canCancel(mockSod({ status: "Cancelled" }), "tari_creator_111")).toBe(false);
    });
  });

  describe("canPay", () => {
    it("allows paying when status is Created and not expired", () => {
      const sod = mockSod({ status: "Created", expiryEpoch: 500 });
      expect(canPay(sod, 400)).toBe(true);
    });

    it("prevents paying when already Paid or Claimed", () => {
      expect(canPay(mockSod({ status: "Paid" }))).toBe(false);
      expect(canPay(mockSod({ status: "Claimed" }))).toBe(false);
      expect(canPay(mockSod({ status: "Cancelled" }))).toBe(false);
    });

    it("prevents paying when expired", () => {
      const sod = mockSod({ status: "Created", expiryEpoch: 500 });
      expect(canPay(sod, 501)).toBe(false);
    });
  });

  describe("canClaim", () => {
    it("allows claim when status is Paid and user holds claim badge", () => {
      const sod = mockSod({ status: "Paid" });
      expect(canClaim(sod, "tari_creator_111", true)).toBe(true);
    });

    it("prevents claim without claim badge (B-02)", () => {
      const sod = mockSod({ status: "Paid" });
      expect(canClaim(sod, "tari_creator_111", false)).toBe(false);
    });

    it("prevents claim when status is Created", () => {
      const sod = mockSod({ status: "Created" });
      expect(canClaim(sod, "tari_creator_111", true)).toBe(false);
    });

    it("prevents claim when status is Cancelled", () => {
      const sod = mockSod({ status: "Cancelled" });
      expect(canClaim(sod, "tari_creator_111", true)).toBe(false);
    });
  });

  describe("mutual reveal (R-05, B-03)", () => {
    it("allows creator or payer to request reveal when Paid", () => {
      const sod = mockSod({ status: "Paid", isRevealed: false, revealRequestedBy: null });
      expect(canRequestReveal(sod, "tari_creator_111", "tari_payer_333")).toBe(true);
      expect(canRequestReveal(sod, "tari_payer_333", "tari_payer_333")).toBe(true);
    });

    it("disallows third party from requesting reveal", () => {
      const sod = mockSod({ status: "Paid" });
      expect(canRequestReveal(sod, "tari_stranger_999", "tari_payer_333")).toBe(false);
    });

    it("disallows requesting reveal if already requested", () => {
      const sod = mockSod({ status: "Paid", revealRequestedBy: "tari_creator_111" });
      expect(canRequestReveal(sod, "tari_payer_333", "tari_payer_333")).toBe(false);
    });

    it("allows other party to approve reveal", () => {
      const sod = mockSod({ status: "Paid", revealRequestedBy: "tari_creator_111" });
      expect(canApproveReveal(sod, "tari_payer_333", "tari_payer_333")).toBe(true);
    });

    it("prevents same party from approving their own reveal request (B-03)", () => {
      const sod = mockSod({ status: "Paid", revealRequestedBy: "tari_creator_111" });
      expect(canApproveReveal(sod, "tari_creator_111", "tari_payer_333")).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("returns false if no expiryEpoch is set", () => {
      const sod = mockSod({ expiryEpoch: null });
      expect(isExpired(sod, 1000)).toBe(false);
    });

    it("returns true if currentEpoch > expiryEpoch", () => {
      const sod = mockSod({ expiryEpoch: 500 });
      expect(isExpired(sod, 501)).toBe(true);
    });
  });
});
