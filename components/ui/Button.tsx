import * as React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-[#E8C547] text-[#111111] hover:bg-[#dfba3b] focus-visible:ring-[#E8C547]",
      secondary:
        "bg-[#0B1D33] text-white hover:bg-[#122b49] focus-visible:ring-[#0B1D33]",
      outline:
        "border border-[#E5E5E2] bg-white text-[#111111] hover:bg-[#F7F7F5] focus-visible:ring-[#111111]",
      ghost:
        "text-[#111111] hover:bg-black/5 focus-visible:ring-[#111111]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
