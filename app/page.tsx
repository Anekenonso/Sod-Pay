import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E2] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0B1D33] shadow-sm mb-6">
            <span className="h-2 w-2 rounded-full bg-[#1F7A4D]" />
            Built on Tari Ootle
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#111111] sm:text-5xl md:text-6xl leading-[1.15]">
            Private payment links.
            <br />
            <span className="text-[#0B1D33]">Amount stays hidden</span> until mutual reveal.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#5C5C5C] max-w-2xl mx-auto leading-relaxed">
            Send and receive one-off payments without broadcasting amounts to the public ledger. Only your claim badge unlocks funds.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app/create" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-3 font-semibold shadow-sm">
                Create a Sod
              </Button>
            </Link>
            <Link href="/app" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 py-3 font-semibold">
                Open Sod
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-[#5C5C5C]">
            Non-custodial · No wallet required to browse · Mainnet default
          </p>
        </div>
      </section>

      {/* Value Pillars / Invariants */}
      <section className="border-t border-[#E5E5E2] bg-white py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Privacy by design, guaranteed on-chain
            </h2>
            <p className="mt-3 text-base text-[#5C5C5C]">
              Built with confidential Tari Ootle templates. No custodial middleman can access or divert your funds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6">
              <div className="h-10 w-10 rounded-lg bg-[#E8C547] flex items-center justify-center text-[#111111] font-bold mb-4">
                01
              </div>
              <h3 className="text-lg font-bold text-[#111111]">Confidential Vault</h3>
              <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">
                Paid amounts remain completely confidential inside Tari Ootle vaults. The public ledger never broadcasts transaction amounts.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6">
              <div className="h-10 w-10 rounded-lg bg-[#0B1D33] flex items-center justify-center text-white font-bold mb-4">
                02
              </div>
              <h3 className="text-lg font-bold text-[#111111]">Claim Badge Authority</h3>
              <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">
                Only the creator who holds the unique non-fungible claim badge can unlock and withdraw funds from the payment vault.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6">
              <div className="h-10 w-10 rounded-lg bg-[#E8C547] flex items-center justify-center text-[#111111] font-bold mb-4">
                03
              </div>
              <h3 className="text-lg font-bold text-[#111111]">Mutual Reveal Only</h3>
              <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">
                Need to verify an amount for accounting? Both parties must approve the reveal. Neither creator nor payer can expose it alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#111111]">
              How Sod Pay Works
            </h2>
            <p className="mt-3 text-base text-[#5C5C5C]">
              Four simple steps from link generation to private settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1D33] text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="text-base font-bold text-[#111111]">Create a Sod</h4>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  Specify an optional requested amount, description, or expiry. Your wallet signs and receives a sovereign claim badge.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1D33] text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="text-base font-bold text-[#111111]">Share the Link</h4>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  Send the payment link or QR code to the payer. The link contains the component address; amount remains undisclosed.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1D33] text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="text-base font-bold text-[#111111]">Pay Privately</h4>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  Payer opens the link and deposits Tari into the confidential vault. Status transitions to Paid without leaking amounts.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1D33] text-white flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h4 className="text-base font-bold text-[#111111]">Claim or Reveal</h4>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  Use your claim badge to release the vault into your wallet. If mutual proof is required, both parties can approve a reveal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#E5E5E2] bg-white py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-[#E5E5E2] p-5">
              <h3 className="font-semibold text-base text-[#111111]">
                What is a Sod?
              </h3>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                A Sod is a confidential smart component deployed on Tari Ootle. It acts as an escrow-like payment conduit where deposited amounts are sealed in zero-knowledge confidential vaults.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E5E2] p-5">
              <h3 className="font-semibold text-base text-[#111111]">
                How does the amount stay private?
              </h3>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                Tari Ootle leverages confidential outputs. The payment vault keeps the deposited amount shielded until both the payer and creator mutually consent to reveal it.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E5E2] p-5">
              <h3 className="font-semibold text-base text-[#111111]">
                Who can claim the payment?
              </h3>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                Only the wallet possessing the unique Claim Badge minted during creation can execute the claim action. Without this badge, on-chain rules reject any withdrawal.
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E5E2] p-5">
              <h3 className="font-semibold text-base text-[#111111]">
                Can I cancel a payment link?
              </h3>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                The creator may cancel a Sod as long as it is still in the Created status (unpaid). Once a payer has deposited funds (Paid status), cancellation is disabled to prevent dispute race conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 px-4 sm:px-6 bg-[#0B1D33] text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Get paid without broadcasting your balance.
          </h2>
          <p className="mt-4 text-base text-slate-300 max-w-xl mx-auto">
            Experience confidential settlement on Tari Ootle.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/app/create">
              <Button size="lg" className="px-8 font-semibold">
                Create a Sod
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
