"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrdersDashboard = pathname === "/dashboard/orders";
  const hideTopNav = isOrdersDashboard || pathname === "/admin/reservations";
  const showHeaderGoldBand = pathname === "/";
  const headerGoldBand = {
    topPx: 0,
    heightBasePx: 132,
    heightAdjustPx: 10, // Increase/decrease the gold band's visible depth.
  };
  const headerGoldBandHeight = Math.max(
    24,
    headerGoldBand.heightBasePx + headerGoldBand.heightAdjustPx,
  );
  const bandStop1 = Math.round(headerGoldBandHeight * 0.11);
  const bandStop2 = Math.round(headerGoldBandHeight * 0.26);
  const bandStop3 = Math.round(headerGoldBandHeight * 0.44);
  const bandStop4 = Math.round(headerGoldBandHeight * 0.62);
  const bandStop5 = Math.round(headerGoldBandHeight * 0.77);
  const bandStop6 = Math.round(headerGoldBandHeight * 0.89);

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col bg-white px-4 py-0 [--header-h:53px] md:[--header-h:92px]">
      {hideTopNav ? null : (
        <>
          {showHeaderGoldBand ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-40 overflow-visible">
              <div
                className="absolute inset-x-0"
                style={{
                  top: `${headerGoldBand.topPx}px`,
                  height: `${headerGoldBandHeight}px`,
                  background:
                    `linear-gradient(to bottom, rgba(184,136,56,0.82) 0px, rgba(184,136,56,0.66) ${bandStop1}px, rgba(184,136,56,0.44) ${bandStop2}px, rgba(184,136,56,0.3) ${bandStop3}px, rgba(184,136,56,0.22) ${bandStop4}px, rgba(184,136,56,0.16) ${bandStop5}px, rgba(184,136,56,0.1) ${bandStop6}px, rgba(184,136,56,0) ${headerGoldBandHeight}px)`,
                }}
              />
            </div>
          ) : null}
        <header className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[var(--header-h)]">
          <div className="relative mx-auto flex h-full max-w-6xl items-start px-4 pt-[2px] md:items-center md:pt-0">
            <TopNav />
          </div>
        </header>
        </>
      )}

      <main className={isOrdersDashboard ? "flex-1 pt-10" : "flex-1 pt-[var(--header-h)]"}>
        {children}
      </main>
    </div>
  );
}
