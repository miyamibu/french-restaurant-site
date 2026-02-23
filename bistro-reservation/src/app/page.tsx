/* eslint-disable react/no-unescaped-entities */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
type MenuKind = "lunch" | "dinner";
const MENU = {
  lunch: {
    label: "ランチ",
    rightImage: "/photos/2.png",
    slides: [
      {
        title: "プティラ",
        subtitle: "Petite La course",
        description: "お気軽に楽しみたいならこれ！",
        image: "/photos/pu.jpg",
        anchor: "petite",
      },
      // ← ジョワは消す
    ],
  },

  dinner: {
    label: "ディナー",
    rightImage: "/photos/2.png",
    slides: [
      // ✅ ディナーは「ジョワが上」
      {
        title: "ジョワ",
        subtitle: "Joie course",
        description: "迷ったら！",
        image: "/photos/jo.jpg",
        anchor: "joie",
      },
      // ✅ 「サンキャトルが下」
      {
        title: "サンキャトル",
        subtitle: "Cent Quatre course",
        description: "ここに来たら是非！",
        image: "/photos/qu.jpg",
        anchor: "cent",
      },
      // ← プティラは消す
    ],
  },
} satisfies Record<MenuKind, any>;

const dishPhotos = [
  { src: "/photos/料理/１.jpg", alt: "料理 01" },
  { src: "/photos/料理/２.jpg", alt: "料理 02" },
  { src: "/photos/料理/３.jpg", alt: "料理 03" },
  { src: "/photos/料理/４.jpg", alt: "料理 04" },
  { src: "/photos/料理/５.jpg", alt: "料理 05" },
  { src: "/photos/料理/６.jpg", alt: "料理 06" },
  { src: "/photos/料理/１.jpg", alt: "料理 07" },
  { src: "/photos/料理/１.jpg", alt: "料理 08" },
  { src: "/photos/料理/１.jpg", alt: "料理 09" },
  { src: "/photos/料理/１.jpg", alt: "料理 10" },
];
function GoldDivider({
  fullBleed = false,
  shiftY = 0,            // ← 追加
  className = "",
}: {
  fullBleed?: boolean;
  shiftY?: number;       // ← 追加
  className?: string;
}) {
  return (
    <div
      className={
        (fullBleed
          ? "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen"
          : "mx-auto max-w-5xl") +
        " px-0 overflow-visible " + 
        className
      }
    >
      <div
  style={{ transform: `translateY(${shiftY}px)` }}
  className="relative h-12 rounded-full overflow-hidden"
>
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#b68c5a]/45 to-transparent" />
  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-gradient-to-b from-transparent via-[#b68c5a] to-transparent" />
</div>
    </div>
  );
}

export default function HomePage() {
  const moreBtn = {
  x: -85,   // 右に+ / 左に-
  y: 260,   // 下に+ / 上に-
};
  const po = {
  w: 200,           // 表示幅（px）
  h: 360,           // 表示高さ（px）
  x: 250,          // 位置：左(-) 右(+)
  y: 250,           // 位置：上(-) 下(+)
  pos: "50% 50%",   // 画像の中の位置（X% Y%）
};
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [menuKind, setMenuKind] = useState<MenuKind>("dinner");
  const activeMenu = MENU[menuKind];

useEffect(() => {
  if (!lightbox) return;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") setLightbox(null);
  };

  document.addEventListener("keydown", onKeyDown);

  // 背景スクロール止める
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.body.style.overflow = prevOverflow;
  };
}, [lightbox]);
  const chefText = {
  label: "text-[12px] md:text-[27px]",
  title: "text-[28px] md:text-[40px]",
  body: "text-[18px] md:text-[24px] leading-relaxed md:leading-relaxed",
};
const storyPos = {
  group: { x: -220, y: -90 },
  label: { x: 150, y: 0 },
  title: { x: 0, y: 0 },
  body: { x: -55, y: 0 },
};
// ← これが必要（今ここが抜けてる）
return (
  <div className="space-y-0 pb-24">

     <div className="fixed bottom-4 right-4 z-[99999] rounded bg-red-600 px-3 py-2 text-white">
      THIS PAGE.TSX IS ACTIVE
     </div>
     {lightbox && (
  <div
    className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 cursor-default"
    role="dialog"
    aria-modal="true"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) setLightbox(null);
    }}
  >
    <div className="relative w-full max-w-5xl">
      <button
        type="button"
        onClick={() => setLightbox(null)}
        className="absolute -top-10 right-0 rounded bg-white/90 px-3 py-1 text-sm text-[#2f1b0f] shadow
                   hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
      >
        閉じる（ESC）
      </button>

      {/* 写真の上だけフォークナイフ */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-black shadow-2xl cursor-utensils">
        <Image
          src={lightbox.src}
          alt={lightbox.alt}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />
      </div>
    </div>
  </div>
)}


      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden -mt-[var(--header-h)] pt-[var(--header-h)] min-h-[620px] md:min-h-[720px] rounded-none">
  <Image
    src="/photos/am.jpg"
    alt=""
    fill
    priority
    className="object-cover"
    style={{ objectPosition: "50% 35%" }}
  />
  <div className="absolute inset-0 bg-gradient-to-br from-[#f5e7ce]/10 via-transparent to-white/5" />

  <div className="absolute inset-0 z-10 pointer-events-none">
    <div className="hero-left-fade absolute left-6 md:left-12 bottom-16 md:bottom-20">
      <Image
        src="/photos/mo.png"
        alt="Cent Quatre"
        width={520}
        height={360}
        className="w-[260px] md:w-[420px] h-auto opacity-100 drop-shadow-lg"
        priority
      />
    </div>
  </div>
</section>

<GoldDivider fullBleed shiftY={-23} className="mb-6" />

<section className="mt-0 pt-[150px] space-y-6 text-center">
  <div className="grid gap-6 md:grid-cols-2 md:items-center border-0 bg-transparent shadow-none ring-0">
    {/* 左カラム：po画像 + ボタン */}
    <div className="relative overflow-visible">
      {/* 画像だけ po で動かす */}
      <div style={{ transform: `translate(${po.x}px, ${po.y}px)` }}>
        <div
          className="relative overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0"
          style={{ width: `${po.w}px`, height: `${po.h}px` }}
        >
          <Image
            src="/photos/po.png"
            alt=""
            fill
            className="object-contain"
            style={{ objectPosition: po.pos }}
          />
        </div>
      </div>

      {/* ボタンは po の外：po をいじっても動かない */}
      <Link
        href="/menu"
        style={{
          left: `calc(100% + 20px + ${moreBtn.x}px)`,
          top: `calc(50% + ${moreBtn.y}px)`,
          writingMode: "horizontal-tb",
          fontFamily:
            '"Noto Serif JP","Yu Mincho","游明朝","Hiragino Mincho ProN","Hiragino Mincho Pro",serif',
        }}
        className={`
          z-50
          pointer-events-auto
          cursor-pointer
          absolute -translate-y-1/2
          group inline-flex h-10 items-center gap-15 whitespace-nowrap
          rounded-[2px]
          border border-[#c7a357]
          bg-gradient-to-b from-[#e6d0a2] to-[#d2ab66]
          px-7
          text-[12px] font-medium tracking-[0.18em] text-[#2f1b0f]
          shadow-[0_1px_0_rgba(0,0,0,0.06)]
          transition
          hover:brightness-[1.03]
          active:brightness-[0.98]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a357]/40
        `}
      >
        <span className="leading-none">READ MORE</span>
      </Link>
    </div>

    {/* 右カラム：2.png + Story（ここに “元の内容” を入れる） */}
    <div className="space-y-3 text-left">
      <div className="relative w-[260px] md:w-[350px] h-[220px] md:h-[300px] translate-x-[-200px] translate-y-[-120px]">
        <Image
          src="/photos/2.png"
          alt="Bistro Cent Quatre"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div style={{ transform: `translate(${storyPos.group.x}px, ${storyPos.group.y}px)` }}>
        <p
          className={`${chefText.label} uppercase tracking-[0.25em] text-[#b68c5a]`}
          style={{ transform: `translate(${storyPos.label.x}px, ${storyPos.label.y}px)` }}
        >
          STORY
        </p>

        <h3
          className={`${chefText.title} font-semibold text-[#2f1b0f]`}
          style={{ transform: `translate(${storyPos.title.x}px, ${storyPos.title.y}px)` }}
        >
          川越をフレンチの街へ
        </h3>

        <p
          className={`${chefText.body} text-[#4a3121] whitespace-pre text-center`}
          style={{ transform: `translate(${storyPos.body.x}px, ${storyPos.body.y}px)` }}
        >
          {"川越は芋ばっかり😩\n街全体が芋になってしまう前にフレンチの街にしよう！"}
        </p>
      </div>
    </div>
  </div>
</section>

{/* 料理セクション：READ MORE と メニューの間 */}
<section className="mt-0 pt-[110px] pb-[30px] text-center">
  <div className="mx-auto max-w-5xl px-4">
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-[#b68c5a]">DISHES</p>
      <h2 className="text-3xl font-semibold text-[#2f1b0f]">料理</h2>
    </div>

    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {dishPhotos.map((p) => (
  <button
    key={p.src}
    type="button"
    onClick={() => setLightbox(p)}
    aria-label={`${p.alt} を拡大`}
    className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-md
             cursor-utensils focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a357]/40">
    <Image
      src={p.src}
      alt={p.alt}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  </button>
))}

    </div>
  </div>
</section>

<GoldDivider fullBleed shiftY={150} className="mb-6" />
      <section className="mt-0 pt-[200px] space-y-6 text-center menu-no-select">
        <div className="mt-8 space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[#b68c5a]">Menu Showcase</p>
          <h2 className="text-3xl font-semibold text-[#2f1b0f]">メニュー</h2>
        </div>
        <div className="mt-6 flex justify-center gap-2">
  {(["lunch", "dinner"] as const).map((k) => {
    const active = menuKind === k;
    return (
      <button
        key={k}
        type="button"
        onClick={() => setMenuKind(k)}
        aria-pressed={active}
        className={[
          "h-10 rounded-[2px] px-6 text-sm tracking-[0.18em] transition select-none",
          active
            ? "bg-[#2f1b0f] text-white shadow"
            : "bg-[#f5e7ce] text-[#2f1b0f] border border-[#cfa96d]/40 hover:brightness-[0.98]",
        ].join(" ")}
      >
        {MENU[k].label}
      </button>
    );
  })}
</div>
        <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-center gap-10">
  {activeMenu.slides.map((item) => (
    <Link
      key={item.title}
      href={`/menu?kind=${menuKind}#${item.anchor}`}
      className="w-full max-w-md cursor-pointer select-none"
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
      onMouseDown={(e) => e.preventDefault()}
      draggable={false}
    >
      <div className="h-64 w-full flex items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#b68c5a]">
            {item.subtitle}
          </p>
          <h3 className="text-2xl font-semibold text-[#2f1b0f]">
            {item.title}
          </h3>
          <p className="text-sm text-[#4a3121]">
            {item.description}
          </p>
        </div>
      </div>
    </Link>
  ))}
</div>
      </section>
    </div>
  );
}
