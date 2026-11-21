"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateForm, CreateSodFormData } from "@/components/sod/CreateForm";

export default function CreateSodPage() {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: CreateSodFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Wiring will be finalized in T-09 with full sim/real flow
      // For now, support local form submission
      console.log("Submitting CreateSodFormData:", data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-[#5C5C5C]">
          <Link href="/app" className="hover:text-[#111111]">
            My Sods
          </Link>
          <span>/</span>
          <span className="text-[#111111] font-medium">Create</span>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-[#E5E5E2] bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Create a Sod
            </h1>
            <p className="mt-2 text-sm text-[#5C5C5C]">
              Generate a private Tari Ootle payment link. Only your claim badge can unlock deposited funds.
            </p>
          </div>

          <CreateForm
            onSubmit={handleCreate}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}
