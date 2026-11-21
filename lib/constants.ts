export const ROUTES = {
  HOME: "/",
  MY_SODS: "/app",
  CREATE_SOD: "/app/create",
  SOD_DETAIL: (id: string) => `/app/s/${id}`,
  PAY_SOD: (id: string) => `/pay/${id}`,
  HEALTH: "/api/health",
} as const;

export const COLORS = {
  background: "#F7F7F5",
  surface: "#FFFFFF",
  text: "#111111",
  textSecondary: "#5C5C5C",
  border: "#E5E5E2",
  accent: "#E8C547",
  accentText: "#111111",
  navy: "#0B1D33",
  success: "#1F7A4D",
  danger: "#B33A3A",
} as const;

export const MICROCOPY = {
  CTA_CREATE: "Create a Sod",
  CTA_OPEN: "Open Sod",
  SAFETY_CREATE: "Only you will receive the claim badge. The amount stays private.",
  PAY_PRIVATE: "This payment is private. The amount will not be visible on the public ledger.",
  CLAIM_BADGE_ONLY: "Only your claim badge can unlock these funds.",
  REVEAL_MUTUAL_REQUIRED: "Nothing shown until both approve.",
  REVEAL_IRREVERSIBLE: "This cannot be undone.",
} as const;

export const APP_CONFIG = {
  DEFAULT_NETWORK: process.env.NEXT_PUBLIC_NETWORK || "mainnet",
  WALLET_DAEMON_URL: process.env.NEXT_PUBLIC_WALLET_DAEMON_URL || "http://127.0.0.1:9000/json_rpc",
  INDEXER_URL: process.env.NEXT_PUBLIC_INDEXER_URL || "",
  TEMPLATE_ADDRESS: process.env.NEXT_PUBLIC_TEMPLATE_ADDRESS || "",
} as const;
