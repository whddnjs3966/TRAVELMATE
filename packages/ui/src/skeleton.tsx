import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-8 w-1/3" />
    </div>
  );
}

export function SkeletonFlightCard() {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-6 w-1/4" />
      </div>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
