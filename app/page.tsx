import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FaqAccordion } from "@/components/home/FaqAccordion";
import { ScrollReveal } from "@/components/home/ScrollReveal";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] overflow-x-hidden">
      {/* Asymmetric Split Hero */}
      <section className="py-12 md:py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 min-w-0 space-y-6">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-[#5C5C5C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A4D] flex-shrink-0" />
              <span>Tari Ootle Mainnet · Confidential vault settlement</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-5xl leading-[1.12]">
              Private payment links.
              <br />
              <span className="text-[#0B1D33]">Amount stays sealed</span> until mutual reveal.
            </h1>

            <p className="text-base sm:text-lg text-[#5C5C5C] max-w-xl leading-relaxed">
              Send and receive one-off payments using Tari Ootle confidential vaults. Only a sovereign claim badge unlocks the vault.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link href="/app/create" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-7 font-medium">
                  Create a Sod
                </Button>
              </Link>
              <Link href="/app" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto px-7 font-medium">
                  Open Sod
                </Button>
              </Link>
            </div>

            <p className="text-xs text-[#767672]">
              Non-custodial · No wallet required to browse · Single-use payment links
            </p>
          </div>

          {/* Product Moment: Sealed Sod Link Specimen */}
          <div className="lg:col-span-5 min-w-0">
            <div className="rounded-2xl border border-[#E5E5E2] bg-white p-5 sm:p-6 shadow-sm space-y-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E5E5E2] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B1D33]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M11 4.5C7.13 4.5 4 7.63 4 11.5C4 14.32 5.67 16.75 8.08 17.85V13.85C6.84 13.06 6 11.67 6 10.1C6 7.84 7.84 6 10.1 6H11V4.5Z"
                        fill="#F7F7F5"
                      />
                      <path
                        d="M13 19.5C16.87 19.5 20 16.37 20 12.5C20 9.68 18.33 7.25 15.92 6.15V10.15C17.16 10.94 18 12.33 18 13.9C18 16.16 16.16 18 13.9 18H13V19.5Z"
                        fill="#E8C547"
                      />
                      <rect x="10.25" y="8.5" width="3.5" height="7" rx="1.75" fill="#E8C547" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-xs font-medium text-[#111111]">Sealed Sod</div>
                    <div className="font-mono text-[11px] text-[#767672]">component_fe9e...8e73</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F7A4D]/25 bg-[#1F7A4D]/10 px-2.5 py-0.5 text-xs font-medium text-[#1F7A4D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A4D]" />
                  Paid
                </span>
              </div>

              <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#5C5C5C]">
                  <span>Confidential vault</span>
                  <span className="font-mono">Sealed</span>
                </div>
                <div className="font-mono text-2xl font-medium tracking-tight text-[#0B1D33] tabular-nums">
                  •••••• TARI
                </div>
                <div className="text-xs text-[#767672]">
                  Hidden on the public ledger until both parties approve reveal.
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#E5E5E2]">
                  <span className="text-[#5C5C5C]">Unlock authority</span>
                  <span className="font-mono text-[#111111]">Claim badge #1</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E5E5E2]">
                  <span className="text-[#5C5C5C]">Mutual reveal</span>
                  <span className="font-mono text-[#111111] tabular-nums">0 / 2 approvals</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#5C5C5C]">Payment link</span>
                  <span className="font-mono text-[#767672]">Closed after settlement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars / Invariants */}
      <section className="border-t border-[#E5E5E2] bg-white py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl font-semibold tracking-tight text-[#111111] sm:text-3xl">
                Privacy by design, guaranteed on-chain
              </h2>
              <p className="mt-3 text-base text-[#5C5C5C]">
                Built with confidential Tari Ootle templates. No custodial middleman can access or divert your funds.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <ScrollReveal delayMs={80} className="md:col-span-5">
              <div className="rounded-xl border border-[#E5E5E2] bg-[#0B1D33] text-white p-6 h-full flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs text-[#E8C547]">01 · Vault</span>
                  <h3 className="mt-3 text-lg font-semibold">Confidential Vault</h3>
                  <p className="mt-2 text-sm text-[#CBD5E1] leading-relaxed">
                    Deposited funds are held inside Tari Ootle confidential vaults rather than transparent public balances.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={160} className="md:col-span-4">
              <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6 h-full flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs text-[#5C5C5C]">02 · Authority</span>
                  <h3 className="mt-3 text-lg font-semibold text-[#111111]">Claim Badge Authority</h3>
                  <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">
                    Only the holder of the unique non-fungible claim badge can unlock and withdraw funds from the payment vault.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={240} className="md:col-span-3">
              <div className="rounded-xl border border-[#E5E5E2] bg-[#F7F7F5] p-6 h-full flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs text-[#5C5C5C]">03 · Disclosure</span>
                  <h3 className="mt-3 text-lg font-semibold text-[#111111]">Mutual Reveal Only</h3>
                  <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">
                    Both parties must approve an on-chain reveal before the contract&apos;s reveal flag and attested amount are unlocked.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="max-w-2xl mb-12">
              <h2 className="text-2xl font-semibold tracking-tight text-[#111111] sm:text-3xl">
                How Sod Pay works
              </h2>
              <p className="mt-3 text-base text-[#5C5C5C]">
                Four steps from link generation to private settlement.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ScrollReveal delayMs={80}>
              <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2] h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0B1D33] text-white flex items-center justify-center font-mono font-medium text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#111111]">Create a Sod</h3>
                  <p className="mt-1 text-sm text-[#5C5C5C] leading-relaxed">
                    Specify an optional requested amount, description, or expiry. Your wallet signs and receives a sovereign claim badge.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={160}>
              <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2] h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0B1D33] text-white flex items-center justify-center font-mono font-medium text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#111111]">Share the link</h3>
                  <p className="mt-1 text-sm text-[#5C5C5C] leading-relaxed">
                    Send the payment link or QR code to the payer. Use an open-amount link when you don&apos;t want a requested amount shown up front.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={240}>
              <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2] h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0B1D33] text-white flex items-center justify-center font-mono font-medium text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#111111]">Pay privately</h3>
                  <p className="mt-1 text-sm text-[#5C5C5C] leading-relaxed">
                    Payer opens the link and deposits Tari into the confidential vault. Status transitions to Paid and the link closes.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={320}>
              <div className="flex gap-4 p-6 bg-white rounded-xl border border-[#E5E5E2] h-full">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#0B1D33] text-white flex items-center justify-center font-mono font-medium text-sm">
                  4
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#111111]">Claim or reveal</h3>
                  <p className="mt-1 text-sm text-[#5C5C5C] leading-relaxed">
                    Use your claim badge to release the vault into your wallet. If mutual proof is required, both parties can approve a reveal.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="border-t border-[#E5E5E2] bg-white py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-[#111111] sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                Everything you need to know about private payments on Tari Ootle.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delayMs={100}>
            <FaqAccordion />
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 px-4 sm:px-6 bg-[#0B1D33] text-white">
        <ScrollReveal>
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Get paid without broadcasting your balance
            </h2>
            <p className="mt-3 text-base text-[#CBD5E1] max-w-xl mx-auto">
              Confidential settlement on Tari Ootle Mainnet.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/app/create">
                <Button size="lg" className="px-8 font-medium text-base">
                  Create a Sod
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
