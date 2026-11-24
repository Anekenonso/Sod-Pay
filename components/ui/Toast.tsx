"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  type?: ToastType;
  detail?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  detail?: string;
}

interface ToastContextValue {
  toast: (
    message: string,
    typeOrOptions?: ToastType | ToastOptions,
    detail?: string
  ) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isDebug, setIsDebug] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const debugEnabled =
        localStorage.getItem("sod_debug") === "1" ||
        process.env.NEXT_PUBLIC_DEBUG_ERRORS === "true";
      setIsDebug(debugEnabled);
    }
  }, []);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const textToCopy = toast.detail || toast.message;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bgClass =
    toast.type === "success"
      ? "bg-[#1F7A4D] text-white border-[#1F7A4D]"
      : toast.type === "error"
      ? "bg-[#B33A3A] text-white border-[#B33A3A]"
      : "bg-[#0B1D33] text-white border-[#0B1D33]";

  return (
    <div
      className={`pointer-events-auto flex flex-col gap-2 p-3.5 rounded-lg border shadow-lg transition-all duration-200 ease-out transform translate-y-0 opacity-100 ${bgClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium leading-snug">{toast.message}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {toast.type === "error" && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
              title="Copy technical error for debugging"
            >
              {copied ? "Copied" : "Copy error"}
            </button>
          )}
          {toast.type === "error" && isDebug && toast.detail && (
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[11px] font-medium transition-colors"
            >
              {showDetails ? "Hide" : "Details"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-white/80 hover:text-white transition-opacity p-1 text-xs"
            aria-label="Dismiss toast"
          >
            ✕
          </button>
        </div>
      </div>

      {toast.type === "error" && isDebug && showDetails && toast.detail && (
        <pre className="text-[11px] font-mono bg-black/30 p-2 rounded overflow-x-auto max-h-32 whitespace-pre-wrap select-all border border-white/10">
          {toast.detail}
        </pre>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      typeOrOptions?: ToastType | ToastOptions,
      optionalDetail?: string
    ) => {
      let type: ToastType = "info";
      let detail = optionalDetail;

      if (typeof typeOrOptions === "string") {
        type = typeOrOptions;
      } else if (typeOrOptions && typeof typeOrOptions === "object") {
        if (typeOrOptions.type) type = typeOrOptions.type;
        if (typeOrOptions.detail) detail = typeOrOptions.detail;
      }

      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, detail }]);

      // Error toasts stay slightly longer to allow reading/copying
      const duration = type === "error" ? 6000 : 3500;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container with smooth 200ms ease-out transitions */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        aria-live="polite"
        role="region"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
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
