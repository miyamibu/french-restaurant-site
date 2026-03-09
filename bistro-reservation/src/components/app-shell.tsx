"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrdersDashboard = pathname === "/dashboard/orders";
  const hideTopNav = isOrdersDashboard || pathname === "/admin/reservations";
  const showMobileHeaderGoldBand = pathname === "/";
  // Public-facing pages manage their own top spacing and should sit under the fixed header.
  const isPublicWebRoute =
    pathname === "/" ||
    pathname === "/booking" ||
    pathname.startsWith("/booking/") ||
    pathname === "/menu" ||
    pathname.startsWith("/menu/") ||
    pathname === "/picture" ||
    pathname.startsWith("/picture/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/access" ||
    pathname.startsWith("/access/") ||
    pathname === "/on-line-store" ||
    pathname.startsWith("/on-line-store/");

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col bg-white px-4 py-0 [--header-h:58px] md:[--header-h:92px]">
      {hideTopNav ? null : (
        <>
        {showMobileHeaderGoldBand ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[110] overflow-visible md:hidden">
            <div
              className="absolute inset-x-0 h-[132px]"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(184,136,56,0.82) 0px, rgba(184,136,56,0.66) 15px, rgba(184,136,56,0.44) 34px, rgba(184,136,56,0.3) 58px, rgba(184,136,56,0.22) 82px, rgba(184,136,56,0.16) 101px, rgba(184,136,56,0.1) 117px, rgba(184,136,56,0) 132px)",
              }}
            />
          </div>
        ) : null}
        <header className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[var(--header-h)]">
          <div className="relative mx-auto flex h-full max-w-6xl items-start px-4 pt-[2px] md:items-center md:pt-0">
            <TopNav />
          </div>
        </header>
        </>
      )}

      <main
        className={
          isOrdersDashboard
            ? "flex-1 pt-10"
            : hideTopNav || isPublicWebRoute
              ? "flex-1 pt-[var(--header-h)] md:pt-0"
              : "flex-1 pt-[var(--header-h)]"
        }
      >
        {children}
      </main>
    </div>
  );
}
