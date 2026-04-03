import React from "react";

interface ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Chip({ children, selected = false, onClick, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-body font-medium transition-all border ${
        selected
          ? "bg-primary text-white border-primary"
          : "bg-surface text-text-secondary border-border hover:border-primary hover:text-primary"
      } ${className}`}
    >
      {children}
    </button>
  );
}
