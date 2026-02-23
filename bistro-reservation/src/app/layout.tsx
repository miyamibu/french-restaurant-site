import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Bistro Joa | 予約システム",
  description: "フレンチレストランの予約・管理システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-gray-900 [--header-h:0px]">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-0 bg-white">
          <header className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)]">
            <div className="mx-auto h-full max-w-6xl px-4">
              {/* TopNavは「高さを増やさない」前提：外側にpy-6とかあるとズレます */}
              <TopNav />
            </div>
          </header>

          {/* 通常ページはヘッダー分だけ下げる */}
          <main className="flex-1 pt-[var(--header-h)]">{children}</main>
        </div>
      </body>
    </html>
  );
}
