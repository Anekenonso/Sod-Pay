"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { Sod } from "@/lib/sod";
import { SodCard } from "@/components/sod/SodCard";
import { Button } from "@/components/ui/Button";
import { ConnectPrompt } from "@/components/wallet/ConnectPrompt";
import { MICROCOPY } from "@/lib/constants";

export default function MySodsPage() {
  const { client, isDemo } = useDemo();
  const [sods, setSods] = useState<Sod[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userAddress, setUserAddress] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sod_user_address");
    }
    return null;
  });
  const [showConnectModal, setShowConnectModal] = useState(false);

  const loadSods = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await client.listSodsByCreator(address);
      setSods(list);

      // Check badge holdings for each Sod
      const holdings: Record<string, boolean> = {};
      for (const sod of list) {
        holdings[sod.id] = await client.userHoldsClaimBadge(sod.id, address);
      }
      setBadgeMap(holdings);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch Sods");
      }
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (userAddress) {
      loadSods(userAddress);
    } else {
      setIsLoading(false);
    }
  }, [userAddress, loadSods]);

  const handleWalletConnected = (address: string) => {
    setUserAddress(address);
    if (typeof window !== "undefined") {
      localStorage.setItem("sod_user_address", address);
    }
    loadSods(address);
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header with Title and Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
              My Sods
            </h1>
            <p className="mt-1 text-sm text-[#5C5C5C]">
              Manage your private payment links and claim funds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {userAddress ? (
              <div className="flex items-center gap-2 bg-white border border-[#E5E5E2] px-3 py-1.5 rounded-lg text-xs">
                <span className="h-2 w-2 rounded-full bg-[#1F7A4D]" />
                <span className="font-mono text-[#111111]">
                  {userAddress.length > 16
                    ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
                    : userAddress}
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConnectModal(true)}
              >
                Connect Wallet
              </Button>
            )}

            <Link href="/app/create">
              <Button size="sm">Create a Sod</Button>
            </Link>
          </div>
        </div>

        {/* Unconnected State */}
        {!userAddress ? (
          <div className="rounded-2xl border border-[#E5E5E2] bg-white p-12 text-center max-w-md mx-auto shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#0B1D33]/10 flex items-center justify-center text-[#0B1D33] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#111111]">Connect to View Your Sods</h3>
            <p className="mt-2 text-sm text-[#5C5C5C]">
              Connect your Tari wallet or test in demo mode to list your created links.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowConnectModal(true)} size="md">
                Connect Wallet
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          /* Skeleton Loading State */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-[#E5E5E2] bg-white p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/3 bg-slate-200 rounded" />
                </div>
                <div className="h-8 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-xl border border-[#B33A3A]/30 bg-[#B33A3A]/10 p-6 text-center">
            <p className="text-sm font-medium text-[#B33A3A]">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => userAddress && loadSods(userAddress)}
            >
              Retry
            </Button>
          </div>
        ) : sods.length === 0 ? (
          /* Empty State (Done-when: empty CTA Create a Sod) */
          <div className="rounded-2xl border border-dashed border-[#E5E5E2] bg-white p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#E8C547]/20 flex items-center justify-center text-[#111111] font-bold mb-4">
              0
            </div>
            <h3 className="text-xl font-bold text-[#111111]">No Sods yet</h3>
            <p className="mt-2 text-sm text-[#5C5C5C]">
              You haven&apos;t created any private payment links yet. Create one to get paid confidentially.
            </p>
            <div className="mt-6">
              <Link href="/app/create">
                <Button size="lg">{MICROCOPY.CTA_CREATE}</Button>
              </Link>
            </div>
          </div>
        ) : (
          /* List State */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sods.map((sod) => (
              <SodCard
                key={sod.id}
                sod={sod}
                holdsClaimBadge={badgeMap[sod.id] ?? false}
              />
            ))}
          </div>
        )}
      </div>

      <ConnectPrompt
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleWalletConnected}
        actionName="view your Sods"
        isDemo={isDemo}
      />
    </main>
  );
}
