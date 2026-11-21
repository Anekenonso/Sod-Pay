"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TariSodClient } from "@/lib/tari/types";
import { getTariSodClient } from "@/lib/tari/client";

interface DemoContextValue {
  isDemo: boolean;
  setIsDemo: (val: boolean) => void;
  toggleDemo: () => void;
  client: TariSodClient;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

function DemoParamDetector({ onDetect }: { onDetect: (isDemo: boolean) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const demoParam = searchParams.get("demo");
    if (demoParam === "1" || demoParam === "true") {
      onDetect(true);
    } else if (demoParam === "0" || demoParam === "false") {
      onDetect(false);
    }
  }, [searchParams, onDetect]);

  return null;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Mainnet is locked default; demo is false by default unless ?demo=1 or stored preference
  const [isDemo, setIsDemoState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sod_pay_demo_mode");
      if (stored !== null) return stored === "true";
      return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    }
    return false;
  });

  const setIsDemo = (val: boolean) => {
    setIsDemoState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("sod_pay_demo_mode", String(val));
    }
  };

  const toggleDemo = () => {
    setIsDemo(!isDemo);
  };

  // Select client by demo flag: SimTariSodClient in demo, RealTariSodClient on mainnet default (R-07, T-19)
  const client: TariSodClient = useMemo(() => getTariSodClient(isDemo), [isDemo]);

  return (
    <DemoContext.Provider value={{ isDemo, setIsDemo, toggleDemo, client }}>
      <Suspense fallback={null}>
        <DemoParamDetector onDetect={setIsDemo} />
      </Suspense>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return ctx;
}
