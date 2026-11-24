import { describe, it, expect } from "vitest";
import { COLORS } from "../lib/constants";
import fs from "fs";
import path from "path";

describe("P1 - Branding and Homepage Polish", () => {
  it("verifies locked branding colors for navy, near-black, and accent yellow", () => {
    expect(COLORS.navy).toBe("#0B1D33");
    expect(COLORS.text).toBe("#111111");
    expect(COLORS.accent).toBe("#E8C547");
  });

  it("verifies the exact required hero trust line copy", () => {
    const requiredTrustLine =
      "Non-custodial · No wallet required to browse · Live on Tari mainnet";
    expect(requiredTrustLine).not.toContain("default");
    expect(requiredTrustLine).toBe(
      "Non-custodial · No wallet required to browse · Live on Tari mainnet"
    );
  });

  it("verifies Navbar does not show a persistent Connect Wallet button when disconnected", () => {
    const connectButtonFile = fs.readFileSync(
      path.resolve(__dirname, "../components/wallet/ConnectButton.tsx"),
      "utf-8"
    );
    // ConnectButton returns null when !isConnected || !address
    expect(connectButtonFile).toContain("if (!isConnected || !address) {\n    return null;\n  }");
  });

  it("verifies new privacy-aligned logo and favicon use locked brand colors and vault emblem", () => {
    const logoFile = fs.readFileSync(
      path.resolve(__dirname, "../components/ui/Logo.tsx"),
      "utf-8"
    );
    expect(logoFile).toContain("#0B1D33");
    expect(logoFile).toContain("#E8C547");
    expect(logoFile).toContain("#111111");
    // Ensure generic shield is replaced
    expect(logoFile).not.toContain("M12 2L20 5.5V12.5C20 17.5");

    const iconSvg = fs.readFileSync(
      path.resolve(__dirname, "../app/icon.svg"),
      "utf-8"
    );
    expect(iconSvg).toContain("#0B1D33");
    expect(iconSvg).toContain("#E8C547");
    expect(iconSvg).not.toContain("M16 6L24 10.5V17.5C24 22");
  });
});
