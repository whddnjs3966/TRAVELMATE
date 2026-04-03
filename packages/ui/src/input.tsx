import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function Input({
  label,
  icon,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-caption font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {icon}
          </span>
        )}
        <input
          className={`w-full rounded-xl border border-border bg-surface px-4 py-3 text-body text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
            icon ? "pl-10" : ""
          } ${error ? "border-error" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-caption text-error">{error}</p>}
    </div>
  );
}
