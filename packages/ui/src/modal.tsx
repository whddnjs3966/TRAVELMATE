import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2 font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary text-xl p-1"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
