"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrdersDashboard = pathname === "/dashboard/orders";
  const hideTopNav = isOrdersDashboard || pathname === "/admin/reservations";

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-0 bg-white">
      {hideTopNav ? null : (
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[var(--header-h)]">
          <div className="mx-auto h-full max-w-6xl px-4">
            <TopNav />
          </div>
        </header>
      )}

      <main className={isOrdersDashboard ? "flex-1 pt-10" : "flex-1 pt-[var(--header-h)]"}>
        {children}
      </main>
    </div>
  );
}
