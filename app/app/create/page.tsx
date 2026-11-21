"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateForm, CreateSodFormData } from "@/components/sod/CreateForm";
import { SharePanel } from "@/components/sod/SharePanel";
import { ConnectPrompt } from "@/components/wallet/ConnectPrompt";
import { useDemo } from "@/components/demo/DemoProvider";
import { Sod } from "@/lib/sod";

export default function CreateSodPage() {
  const { client, isDemo } = useDemo();
  const [createdSod, setCreatedSod] = useState<Sod | null>(null);
  const [claimBadgeId, setClaimBadgeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User wallet state
  const [userAddress, setUserAddress] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sod_user_address");
    }
    return null;
  });
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<CreateSodFormData | null>(null);

  const handleWalletConnected = async (address: string) => {
    setUserAddress(address);
    if (typeof window !== "undefined") {
      localStorage.setItem("sod_user_address", address);
    }

    if (pendingFormData) {
      await executeCreate(pendingFormData, address);
      setPendingFormData(null);
    }
  };

  const executeCreate = async (data: CreateSodFormData, address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.createSod(
        {
          amount: data.amount || null,
          description: data.description,
          expiryEpoch: data.expiryEpoch,
        },
        address
      );
      setCreatedSod(res.sod);
      setClaimBadgeId(res.claimBadgeId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create Sod");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (data: CreateSodFormData) => {
    if (!userAddress) {
      setPendingFormData(data);
      setShowConnectModal(true);
      return;
    }

    await executeCreate(data, userAddress);
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
          {!createdSod ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
                  Create a Sod
                </h1>
                <p className="mt-2 text-sm text-[#5C5C5C]">
                  Generate a private Tari Ootle payment link. Only your claim badge can unlock deposited funds.
                </p>
                {userAddress && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#5C5C5C]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1F7A4D]" />
                    <span>Connected: </span>
                    <span className="font-mono font-medium text-[#111111]">
                      {userAddress.length > 20
                        ? `${userAddress.slice(0, 8)}...${userAddress.slice(-6)}`
                        : userAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserAddress(null);
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("sod_user_address");
                        }
                      }}
                      className="text-xs text-[#B33A3A] hover:underline ml-2"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              <CreateForm
                onSubmit={handleCreateSubmit}
                isLoading={isLoading}
                error={error}
              />
            </>
          ) : (
            <SharePanel sod={createdSod} claimBadgeId={claimBadgeId || ""} />
          )}
        </div>
      </div>

      <ConnectPrompt
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleWalletConnected}
        actionName="create a Sod"
        isDemo={isDemo}
      />
    </main>
  );
}
