import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#E5E5E2]/60 transition-all duration-200 ease-out ${className}`}
      {...props}
    />
  );
}
