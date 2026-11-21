"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container with smooth 200ms ease-out transitions */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        aria-live="polite"
        role="region"
      >
        {toasts.map((t) => {
          const bgClass =
            t.type === "success"
              ? "bg-[#1F7A4D] text-white border-[#1F7A4D]"
              : t.type === "error"
              ? "bg-[#B33A3A] text-white border-[#B33A3A]"
              : "bg-[#0B1D33] text-white border-[#0B1D33]";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-200 ease-out transform translate-y-0 opacity-100 ${bgClass}`}
            >
              <span className="text-sm font-medium">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-white/80 hover:text-white transition-opacity p-1 text-xs"
                aria-label="Dismiss toast"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
