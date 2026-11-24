"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "What is a Sod?",
    answer:
      "A Sod is a confidential smart component deployed on Tari Ootle. It acts as an escrow-like payment conduit where deposited amounts are sealed in zero-knowledge confidential vaults.",
  },
  {
    question: "How does the amount stay private?",
    answer:
      "Tari Ootle leverages confidential outputs. The payment vault keeps the deposited amount shielded until both the payer and creator mutually consent to reveal it.",
  },
  {
    question: "Who can claim the payment?",
    answer:
      "Only the wallet possessing the unique Claim Badge minted during creation can execute the claim action. Without this badge, on-chain rules reject any withdrawal.",
  },
  {
    question: "Can I cancel a payment link?",
    answer:
      "The creator may cancel a Sod as long as it is still in the Created status (unpaid). Once a payer has deposited funds (Paid status), cancellation is disabled to prevent dispute race conditions.",
  },
  {
    question: "What happens during a mutual reveal?",
    answer:
      "When both creator and payer approve the reveal, the payment amount becomes verifiable on-chain. Neither party can expose the amount unilaterally.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        const panelId = `faq-panel-${idx}`;
        const buttonId = `faq-button-${idx}`;

        return (
          <div
            key={faq.question}
            className="rounded-xl border border-[#E5E5E2] bg-white transition-colors hover:border-slate-300 overflow-hidden"
          >
            <button
              id={buttonId}
              type="button"
              onClick={() => toggleIndex(idx)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full min-h-[56px] items-center justify-between gap-4 p-5 text-left text-base font-semibold text-[#111111] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1D33]"
            >
              <span className="leading-snug">{faq.question}</span>
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F7F7F5] text-[#5C5C5C] text-sm transition-transform duration-200 ${
                  isOpen ? "rotate-180 bg-[#0B1D33] text-white" : ""
                }`}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 pt-1 text-sm text-[#5C5C5C] leading-relaxed border-t border-[#E5E5E2]/40">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
