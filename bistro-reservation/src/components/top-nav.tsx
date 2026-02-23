"use client";

import Link from "next/link";
import { useState } from "react";
import { Instagram, Menu, X } from "lucide-react";
import { Playfair_Display } from "next/font/google";
const links = [
  { href: "/", label: "ホーム" },
  { href: "/reserve", label: "予約" },
  { href: "/menu", label: "メニュー" },
  { href: "/photos", label: "写真" },
  { href: "/info", label: "アクセス" },
];
const logoFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
export function TopNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="flex items-center justify-between rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
        <a
          href="https://www.instagram.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagramへ"
          className="text-[#6b3b20] hover:text-[#8a4c29] transition"
        >
          <Instagram size={22} />
        </a>

        <Link
  href="/"
  aria-label="ホームへ戻る"
  className={`text-center ${logoFont.className} cursor-pointer select-none`}
  onClick={() => setOpen(false)} // もしメニューが開いてたら閉じる
>
  <p className="text-[11px] uppercase tracking-[0.25em] text-[#b68c5a]">Bistro １０４</p>
  <p className="text-lg font-semibold text-[#2f1b0f]">Cent Quatre</p>
</Link>

        <button
          aria-label="メニューを開く"
          className="flex items-center justify-center text-[#6b3b20] hover:text-[#8a4c29] transition"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="absolute left-1/2 top-8 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#6b3b20]">メニュー</p>
              <button aria-label="閉じる" onClick={() => setOpen(false)} className="text-[#6b3b20] hover:text-[#8a4c29]">
                <X size={20} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg border border-[#b68c5a]/30 px-3 py-2 text-[#2f1b0f] hover:bg-[#f4e8d8]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
