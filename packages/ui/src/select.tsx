import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
  icon?: React.ReactNode;
  placeholder?: string;
}

export function Select({
  label,
  options,
  icon,
  placeholder,
  className = "",
  ...props
}: SelectProps) {
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
        <select
          className={`w-full appearance-none rounded-xl border border-border bg-surface px-4 py-3 text-body text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${
            icon ? "pl-10" : ""
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
          ▾
        </span>
      </div>
    </div>
  );
}
