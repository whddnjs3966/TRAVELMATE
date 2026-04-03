import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-text-secondary",
    primary: "bg-primary-light text-primary",
    secondary: "bg-orange-50 text-secondary",
    success: "bg-emerald-50 text-success",
    warning: "bg-amber-50 text-warning",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-3 py-1 text-caption",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
}
