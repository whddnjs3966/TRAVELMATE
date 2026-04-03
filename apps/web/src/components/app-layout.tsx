"use client";

import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@tripflow/ui";

const navItems = [
  { id: "home", label: "홈", icon: "🏠", href: "/" },
  { id: "search", label: "검색", icon: "✈️", href: "/search" },
  { id: "trips", label: "내일정", icon: "📋", href: "/trips" },
  { id: "mypage", label: "마이", icon: "👤", href: "/mypage" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const activeId = navItems.find((item) =>
    pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  )?.id || "home";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pb-20">
        {children}
      </div>
      <BottomNav
        items={navItems}
        activeId={activeId}
        onNavigate={(href) => router.push(href)}
      />
    </div>
  );
}
