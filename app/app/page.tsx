"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTariClient } from "@/lib/tari/provider";
import { Sod } from "@/lib/sod";
import { SodCard } from "@/components/sod/SodCard";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/components/wallet/WalletContext";
import { MICROCOPY } from "@/lib/constants";

export default function MySodsPage() {
  const client = useTariClient();
  const { address: userAddress, isConnected, promptConnect } = useWallet();
  const [sods, setSods] = useState<Sod[]>([]);
  const [paidSods, setPaidSods] = useState<Sod[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const loadSods = useCallback(
    async (address: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const [createdList, paidList] = await Promise.all([
          client.listSodsByCreator(address),
          client.listSodsByPayer ? client.listSodsByPayer(address) : Promise.resolve([]),
        ]);
        setSods(createdList);
        const createdIds = new Set(createdList.map((s) => s.id));
        setPaidSods(paidList.filter((s) => !createdIds.has(s.id)));

        // Check badge holdings on-chain for each created Sod
        const holdings: Record<string, boolean> = {};
        for (const sod of createdList) {
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
    },
    [client]
  );

  useEffect(() => {
    if (userAddress) {
      loadSods(userAddress);
    } else {
      setIsLoading(false);
      setSods([]);
      setPaidSods([]);
    }
  }, [userAddress, loadSods]);

  const handleImportSod = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = importId.trim();
    if (!trimmed) return;
    setImportError(null);
    setIsImporting(true);
    try {
      const found = await client.getSod(trimmed);
      if (!found) {
        setImportError("No Sod component found on-chain for that ID.");
        return;
      }
      if (userAddress && typeof window !== "undefined") {
        const key = `sod_created_${userAddress}`;
        const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
        if (!existing.includes(found.id)) {
          existing.push(found.id);
          localStorage.setItem(key, JSON.stringify(existing));
        }
        await loadSods(userAddress);
      }
      setImportId("");
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Failed to look up Sod component");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header with Title and Create Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111]">
              My Sods
            </h1>
            <p className="mt-1 text-sm text-[#5C5C5C]">
              Manage your private payment links and claim funds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && userAddress ? (
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
                onClick={() => promptConnect("view your Sods")}
              >
                Connect Wallet
              </Button>
            )}

            <Link href="/app/create">
              <Button size="sm">Create a Sod</Button>
            </Link>
          </div>
        </div>

        {/* Cross-device Component Import */}
        {userAddress && (
          <form onSubmit={handleImportSod} className="mb-8 rounded-xl border border-[#E5E5E2] bg-white p-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={importId}
                onChange={(e) => setImportId(e.target.value)}
                placeholder="Import existing Sod by component address (component_...)"
                disabled={isImporting}
                className="flex-1 min-w-0 rounded-lg border border-[#E5E5E2] bg-[#F7F7F5] px-3 py-2 text-sm font-mono text-[#111111] placeholder:font-sans placeholder:text-[#5C5C5C]/70 focus:border-[#0B1D33] focus:bg-white focus:outline-none"
              />
              <Button type="submit" variant="outline" size="sm" disabled={isImporting || !importId.trim()}>
                {isImporting ? "Checking…" : "Import Sod"}
              </Button>
            </div>
            {importError && (
              <p className="mt-2 text-xs text-[#B33A3A]" role="alert">
                {importError}
              </p>
            )}
          </form>
        )}

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
              Connect your Tari wallet to list your created links.
            </p>
            <div className="mt-6">
              <Button onClick={() => promptConnect("view your Sods")} size="md">
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
                className="h-48 rounded-xl border border-[#E5E5E2] bg-white p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 w-20 bg-[#EFEFEA] rounded" />
                  <div className="h-6 w-3/4 bg-[#EFEFEA] rounded" />
                  <div className="h-4 w-1/3 bg-[#EFEFEA] rounded" />
                </div>
                <div className="h-8 w-full bg-[#F7F7F5] rounded" />
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
        ) : sods.length === 0 && paidSods.length === 0 ? (
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
          <div className="space-y-10">
            {sods.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-[#5C5C5C]">
                  Created by you
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sods.map((sod) => (
                    <SodCard
                      key={sod.id}
                      sod={sod}
                      role="creator"
                      holdsClaimBadge={badgeMap[sod.id] ?? false}
                    />
                  ))}
                </div>
              </section>
            )}

            {paidSods.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-medium text-[#5C5C5C]">
                  Payments made
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paidSods.map((sod) => (
                    <SodCard
                      key={sod.id}
                      sod={sod}
                      role="payer"
                      holdsClaimBadge={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
