"use client";

import React, { useMemo } from "react";
import { generateQrMatrix } from "@/lib/qr";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 160, className = "" }: QrCodeProps) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) {
    return null;
  }

  const count = matrix.length;
  const quiet = 2;
  const viewSize = count + quiet * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Payment QR Code"
      className={className}
    >
      <rect width={viewSize} height={viewSize} fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quiet}
              y={r + quiet}
              width={1}
              height={1}
              fill="#0B1D33"
            />
          ) : null
        )
      )}
    </svg>
  );
}
