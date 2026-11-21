import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[#111111]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={twMerge(
            clsx(
              "flex h-10 w-full rounded-lg border border-[#E5E5E2] bg-white px-3 py-2 text-sm text-[#111111] placeholder:text-[#5C5C5C]/60 focus:border-[#0B1D33] focus:outline-none focus:ring-1 focus:ring-[#0B1D33] disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-[#B33A3A] focus:border-[#B33A3A] focus:ring-[#B33A3A]",
              className
            )
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="text-xs text-[#5C5C5C]">{helperText}</p>
        )}
        {error && <p className="text-xs text-[#B33A3A]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
