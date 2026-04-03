import React from "react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface BottomNavProps {
  items: NavItem[];
  activeId: string;
  onNavigate: (href: string) => void;
}

export function BottomNav({ items, activeId, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.href)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-text-tertiary"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
