"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MICROCOPY } from "@/lib/constants";

export interface CreateSodFormData {
  amount: string;
  description: string;
  expiryEpoch: number | null;
}

interface CreateFormProps {
  onSubmit: (data: CreateSodFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function CreateForm({ onSubmit, isLoading = false, error = null }: CreateFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expiryHours, setExpiryHours] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!description.trim()) {
      setValidationError("Description is required");
      return;
    }

    if (amount.trim() && (isNaN(Number(amount)) || Number(amount) <= 0)) {
      setValidationError("Amount must be a positive number if provided");
      return;
    }

    let expiryEpoch: number | null = null;
    if (expiryHours.trim() && !isNaN(Number(expiryHours)) && Number(expiryHours) > 0) {
      // Mock epoch conversion: current timestamp + hours * 3600
      expiryEpoch = Math.floor(Date.now() / 1000) + Math.floor(Number(expiryHours) * 3600);
    }

    try {
      await onSubmit({
        amount: amount.trim() || "",
        description: description.trim(),
        expiryEpoch,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setValidationError(err.message);
      } else {
        setValidationError("Failed to create Sod");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Active Errors */}
      {(validationError || error) && (
        <div
          role="alert"
          className="rounded-lg border border-[#B33A3A]/20 bg-[#B33A3A]/10 p-3 text-sm text-[#B33A3A]"
        >
          {validationError || error}
        </div>
      )}

      {/* Description Field */}
      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-[#111111]"
        >
          Description / Note <span className="text-[#B33A3A]">*</span>
        </label>
        <textarea
          id="description"
          rows={3}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Invoice #1042 - Frontend UX design"
          disabled={isLoading}
          className="w-full rounded-lg border border-[#E5E5E2] bg-white p-3 text-sm text-[#111111] placeholder:text-[#5C5C5C]/60 focus:border-[#0B1D33] focus:outline-none focus:ring-1 focus:ring-[#0B1D33] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-[#5C5C5C]">
          Brief note for the payer describing what this payment is for.
        </p>
      </div>

      {/* Amount Field */}
      <Input
        id="amount"
        label="Amount (TARI)"
        type="number"
        step="any"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 50 (optional)"
        helperText="Leave empty to allow the payer to enter an open amount."
        disabled={isLoading}
      />

      {/* Expiry Field */}
      <Input
        id="expiryHours"
        label="Expires In (Hours - Optional)"
        type="number"
        min="1"
        value={expiryHours}
        onChange={(e) => setExpiryHours(e.target.value)}
        placeholder="e.g. 24 (optional)"
        helperText="Payment link will expire after this duration. Leave blank for no expiry."
        disabled={isLoading}
      />

      {/* Safety Microcopy Line (Locked) */}
      <div className="rounded-lg bg-[#F7F7F5] border border-[#E5E5E2] p-3.5 flex items-start gap-2.5">
        <svg
          className="h-5 w-5 text-[#1F7A4D] flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p className="text-xs font-medium text-[#111111] leading-relaxed">
          {MICROCOPY.SAFETY_CREATE}
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        size="lg"
        className="w-full text-base font-semibold shadow-sm min-h-[48px] justify-center"
      >
        {isLoading ? "Creating…" : MICROCOPY.CTA_CREATE}
      </Button>
    </form>
  );
}
