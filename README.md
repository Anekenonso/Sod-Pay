# Sod Pay

> Private payment links on Tari Ootle. The payment amount stays confidential until mutual reveal; only a claim badge unlocks funds.

---

## 1. Links & Resources

- **Live Application:** [https://sod-pay.vercel.app](https://sod-pay.vercel.app) *(or local `http://localhost:3000`)*
- **Interactive Demo:** [https://sod-pay.vercel.app?demo=1](https://sod-pay.vercel.app?demo=1)
- **GitHub Repository:** [https://github.com/Anekenonso/Sod-Pay](https://github.com/Anekenonso/Sod-Pay)
- **Tari Template:** `template/src/lib.rs` (Tari Ootle WASM contract)
- **Announcement Thread:** [Tari Forum Contest Thread /t/520](https://tari.community)

---

## 2. At a Glance

| Feature | Description |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, React 19, Tailwind CSS, TypeScript, pnpm) |
| **Smart Contract** | Rust `#[template]` targeting Tari Ootle engine |
| **Privacy Model** | Amount hidden in confidential vault; mutual approval required for reveal |
| **Access Control** | Non-fungible Claim Badge minted directly to creator; non-transferable authority |
| **Cancellation** | Creator only, strictly before payment has been deposited |
| **Default Mode** | Tari Mainnet default (`mode: REAL`); zero-setup demo mode (`?demo=1`) |

---

## 3. The Idea in One Minute

Typical Web3 payment links expose recipient balances, transaction values, and counterparty wallets publicly on block explorers. Sod Pay solves this on Tari Ootle:
1. **Creator creates a Sod:** Specifies an optional requested amount and description. A unique non-fungible Claim Badge is minted to the creator's wallet.
2. **Payer deposits privately:** The payer sends Tari directly into the Sod component's confidential vault. The payment amount remains encrypted.
3. **Claim with Badge:** Only the holder of the matching Claim Badge can trigger withdrawal of the locked vault.
4. **Mutual-Only Reveal:** The payment amount remains secret until **both** creator and payer explicitly approve the reveal.

---

## 4. Why Sod Pay?

- **Confidential Commerce:** Freelancers, merchants, and OTC traders can accept payments without broadcasting deal sizes to competitors or observers.
- **Badge-Gated Authority:** Funds cannot be siphoned or claimed by unauthorized parties. Only the verifiable Claim Badge unlocks the vault.
- **Anti-Griefing Invariants:** Creators can safely cancel unpaid links. Once funds are deposited, payments cannot be unilaterally revoked.

---

## 5. Product Tour (Routes)

- `/` — Homepage: Project value propositions, privacy architecture explanation, and FAQ. No wallet connection prompt.
- `/app` — My Sods: Dashboard listing payment links created by the connected wallet, with real-time status badges.
- `/app/create` — Create Sod: Form to issue a new private payment link, minting the associated Claim Badge.
- `/app/s/[id]` — Sod Detail: Shareable links, QR code, claim actions, and mutual reveal approvals.
- `/pay/[id]` — Pay Page: Dedicated payment interface for payers supporting both fixed and open-amount payments.
- `/api/health` — Health check endpoint returning `{ ok: true }`.

---

## 6. How It Works (Protocol Architecture)

```
[Creator] ---> create() ---> [Sod Component] + [Claim Badge minted to Creator]
                                  |
[Payer]   ---> pay(amount)  ---> [Confidential Vault locked]
                                  |
[Creator] ---> claim(Badge) ---> [Funds transferred to Creator]
                                  |
[Both]    ---> reveal()     ---> [Amount revealed publicly]
```

1. **Instantiation:** `create(amount, description, expiry)` initializes the component state and issues a single `ClaimBadge` resource into the creator's account.
2. **Deposit:** `pay()` deposits TARI into the component's internal vault and sets status to `Paid`.
3. **Claim:** `claim()` requires the caller to present the `ClaimBadge` via Tari access rules (`rule!(resource(badge_addr))`).
4. **Mutual Reveal:** `request_reveal()` and `approve_reveal()` ensure neither party can expose the amount unilaterally.

---

## 7. Verification & Invariants

The protocol enforces 5 core invariants in both the Rust template (`template/src/lib.rs`) and the client engine:
1. **Claim Badge Exclusivity:** Vault redemption requires proof of the specific non-fungible badge.
2. **Mutual Reveal Requirement:** Amount remains private until two distinct cryptographic parties approve.
3. **Cancel Preconditions:** Cancel succeeds only from `Created` state by the original creator. Calling `cancel` after `pay` aborts immediately.
4. **Exact Amount Enforcement:** Fixed-amount Sods reject mismatched deposits.
5. **Expiry Bounds:** Expired Sods reject new deposits and allow creator reclaim.

---

## 8. REAL vs. SIMULATED Mode

- **REAL (`mode: "REAL"`):** The default operational mode. Connects to the Tari Indexer and Tari Wallet Daemon via `@tari-project/ootle` SDK. Every action signs and submits an on-chain transaction.
- **SIMULATED (`mode: "SIMULATED"`):** Activated via `?demo=1` or the navigation toggle. Exercises the complete contract state machine in-memory without requiring a local wallet daemon or testnet tokens. A persistent banner clearly identifies simulation mode.

---

## 9. Quickstart

### Prerequisites
- Node.js 20+ and `pnpm`
- Rust 1.80+ with `wasm32-unknown-unknown` target (for template)

### Frontend (Next.js 15)
```bash
# Install dependencies
pnpm install

# Run unit and integration tests (Vitest)
pnpm test

# Build for production
pnpm build

# Start local development server
pnpm dev
```

### Smart Contract (Rust Tari Template)
```bash
cd template

# Run the 5 on-chain engine tests
cargo test
```

---

## 10. Repository Layout

```
.
├── app/                  # Next.js 15 App Router pages & API routes
│   ├── api/health/       # System health route
│   ├── app/              # Dashboard & Create flows
│   ├── pay/[id]/         # Payer payment view
│   └── page.tsx          # Homepage
├── components/           # UI and domain components (Tailwind CSS)
│   ├── demo/             # Demo mode provider and banners
│   ├── layout/           # Navbar, Footer, MobileMenu
│   ├── sod/              # CreateForm, SodCard, SharePanel
│   └── wallet/           # Session management and connect prompts
├── lib/                  # Protocol libraries and SDK adapters
│   ├── tari/             # Real and Simulated Tari client implementations
│   ├── constants.ts      # Routes, tokens, microcopy
│   └── sod.ts            # Domain types and transition flags
├── template/             # Tari Ootle Rust template
│   ├── src/lib.rs        # Contract logic and unit test suite
│   └── Cargo.toml        # tari_template_lib dependency
├── test/                 # Test suites (Vitest)
└── docs/                 # Specifications and task tracking
```

---

## 11. Security & Risks

- **Wallet Daemon Dependency:** Real on-chain operations require Tari Wallet Daemon running locally or an integrated Tari web wallet provider.
- **WASM Prerendering:** Next.js uses client-side dynamic loading for WebAssembly packages to preserve static server generation.
- **Indexer Sync:** Substate finality relies on block commitment by validators.

---

## 12. License

This project is licensed under the [MIT License](LICENSE).
