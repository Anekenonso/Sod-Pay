"use client";

import React, { createContext, useContext, useMemo } from "react";
import { TariSodClient } from "./types";
import { getTariSodClient } from "./client";

const TariContext = createContext<TariSodClient | undefined>(undefined);

export function TariProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getTariSodClient(), []);

  return <TariContext.Provider value={client}>{children}</TariContext.Provider>;
}

export function useTariClient(): TariSodClient {
  const ctx = useContext(TariContext);
  if (!ctx) {
    return getTariSodClient();
  }
  return ctx;
}
