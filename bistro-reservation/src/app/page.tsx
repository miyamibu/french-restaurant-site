/* eslint-disable react/no-unescaped-entities */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Tangerine } from "next/font/google";
const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
type MenuKind = "lunch" | "dinner";
type MenuSlide = {
  title: string;
  subtitle: string;
  description: string;
  anchor: string;
};
type MenuGroup = {
  label: string;
  slides: MenuSlide[];
};

const menuCardText = {
  subtitleWrap: "flex items-baseline justify-center gap-x-3",
  subtitleJa:
    "text-[20px] md:text-[20px] uppercase tracking-[0.30em] text-[#b68c5a]",
  subtitleEn:
    "text-[16px] md:text-[40px] text-[#b68c5a] leading-none",
  title:
    "text-[20px] md:text-[20px] font-semibold text-[#2f1b0f] leading-[1.15] tracking-[0.06em]",
  meta:
    "text-[10px] md:text-[20px] text-[#2f1b0f]/80 tracking-[0.12em]",
  desc:
    "text-[10px] md:text-[20px] text-[#4a3121] leading-[1.75]",
};

function splitJaEnSubtitle(s: string) {
  const m = s.match(/[A-Za-z]/);
  if (!m || m.index == null) return { ja: s.trim(), en: "" };
  return { ja: s.slice(0, m.index).trim(), en: s.slice(m.index).trim() };
}

function splitCourseTitle(raw: string) {
  // 全角/半角スペース両対応で分割
  const parts = raw.split(/[ 　]+/).filter(Boolean);

  const main = parts[0] ?? raw; // キャッチ
  let count = "";
  let price = "";

  if (parts.length >= 3) {
    price = parts[parts.length - 1]; // 末尾を価格扱い
    count = parts.slice(1, parts.length - 1).join(" "); // 真ん中を品数扱い
  } else if (parts.length === 2) {
    count = parts[1];
  }

  return { main, count, price };
}

const MENU = {
  lunch: {
    label: "ランチ",
    slides: [
      {
        title: "北京じゃないよ 4品 3,500円",
        subtitle: " プティラ Petite La course",
        description: "前菜、メイン 、フリアンディーズ、コーヒーまたは紅茶",
        anchor: "petite",
      },
    ],
  },

  dinner: {
    label: "ディナー",
    slides: [
      {
        title: "実食！ ５品 8,500円",
        subtitle: "ジョワ Joie course",
        description: "アミューズ、前菜、メイン×２、デザート、フリアンディーズ、コーヒーまたは紅茶",
        anchor: "joie",
      },
      {
        title: "戸田市 ６～７品 12,500円",
        subtitle: "サンキャトル Cent Quatre course",
        description: "アミューズ、前菜×２、メイン×２、デザート、フリアンディーズ、コーヒーまたは紅茶",
        anchor: "cent-quatre",
      },
    ],
  },
} satisfies Record<MenuKind, MenuGroup>;

const DRINK_MENU = {
  title: "ドリンクメニュー",
  subtitle: "ドリンク Alcohol",
  description:
    "グラスワイン、ボトル、カクテル、ノンアルコールまで幅広くご用意しています。",
};

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
  { src: "/photos/料理/１.jpg", alt: "料理 10" },];
function GoldDivider({
  fullBleed = false,
  shiftY = 0,            // ← 追加
  className = "",}: {
  fullBleed?: boolean;
  shiftY?: number;       // ← 追加
  className?: string;}) { return (
    <div
      className={(fullBleed
          ? "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen"
          : "mx-auto max-w-5xl") +" px-0 overflow-visible " + 
      className}>
  <div
  style={{ transform: `translateY(${shiftY}px)` }}
  className="relative h-12 rounded-full overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#b68c5a]/45 to-transparent" />
  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-7 bg-gradient-to-b from-transparent via-[#b68c5a] to-transparent" />
</div>
    </div>
  );}

export default function HomePage() {
const moreBtn = {
  x: 0,   // 右に+ / 左に-
  y: 534,   // 下に+ / 上に-（約12cm分）
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
const infoPos = {
  group: { x: 0, y:100 },
  heading: { x: 0, y: 0 },
  body: { x: 0, y: 0 },
  subheading: { x: 0, y: 0 },
  subbody: { x: 0, y: 0 },
};
const contactPos = {
  group: { x:20, y:350 },
  map: { x: 0, y:300 },
};
const contactSpacing = {
  extraBottom: 150, // 下余白の微調整(px)
};
const readMoreDividerPos = { y:130 }; // READ MORE と DISHES 間の帯の微調整(px)
const dishesSpacing = { top:110 }; // DISHES セクション全体の下げ幅(px)
const storeLabel = {
  href: "/store",
  text: "ONLINE STORE",
};
const storeLabelPos = { x: 13, y: 0 }; // 右側ラベルの微調整(px)
const storeLabelSize = { py: 18, px: 12, font: 11, tracking: 0.24 }; // 右ラベル微調整
const reserveLabel = {
  href: "/reserve",
  text: "RESERVE",
};
const reserveLabelPos = { x:-12, y: 0 }; // 左側ラベルの微調整(px)
const reserveLabelSize = { py:39, px: 12, font: 11, tracking: 0.24 }; // 左ラベル微調整
return (
  <div className="space-y-0 pb-24">

     <div className="fixed bottom-4 right-4 z-[99999] rounded bg-red-600 px-3 py-2 text-white">
      THIS PAGE.TSX IS ACTIVE
     </div>
     <a
       href={reserveLabel.href}
       aria-label="予約"
       className="fixed left-3 top-1/2 z-40 rounded-r-md bg-[#b32626] text-white shadow-lg transition hover:brightness-[1.05] active:brightness-[0.98]"
       style={{
         writingMode: "vertical-rl",
         textOrientation: "mixed",
         padding: `${reserveLabelSize.py}px ${reserveLabelSize.px}px`,
         fontSize: `${reserveLabelSize.font}px`,
         letterSpacing: `${reserveLabelSize.tracking}em`,
         transform: `translate(${reserveLabelPos.x}px, ${reserveLabelPos.y}px) translateY(-50%)`,
       }}
     >
       {reserveLabel.text}
     </a>
     <a
       href={storeLabel.href}
       aria-label="オンラインストア"
       className="fixed right-3 top-1/2 z-40 rounded-l-md bg-[#1f4f8f] text-white shadow-lg transition hover:brightness-[1.05] active:brightness-[0.98]"
       style={{
         writingMode: "vertical-rl",
         textOrientation: "mixed",
         padding: `${storeLabelSize.py}px ${storeLabelSize.px}px`,
         fontSize: `${storeLabelSize.font}px`,
         letterSpacing: `${storeLabelSize.tracking}em`,
         transform: `translate(${storeLabelPos.x}px, ${storeLabelPos.y}px) translateY(-50%)`,
       }}
     >
       {storeLabel.text}
     </a>
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
  <div className="mx-auto flex w-full max-w-5xl justify-center">
    <Link
      href="/menu"
      style={{
        transform: `translate(${moreBtn.x}px, ${moreBtn.y}px)`,
        writingMode: "horizontal-tb",
        fontFamily:
          '"Noto Serif JP","Yu Mincho","游明朝","Hiragino Mincho ProN","Hiragino Mincho Pro",serif',
      }}
      className="
        z-20
        pointer-events-auto
        cursor-pointer
        inline-flex h-10 items-center whitespace-nowrap
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
      "
    >
      <span className="leading-none">READ MORE</span>
    </Link>
  </div>

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

<GoldDivider fullBleed shiftY={readMoreDividerPos.y} className="mb-6" />

{/* 料理セクション：READ MORE と メニューの間 */}
<section
  className="mt-0 pt-[110px] pb-[30px] text-center"
  style={{ marginTop: `${dishesSpacing.top}px` }}
>
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
  {activeMenu.slides.map((item) => {
  const { main, count, price } = splitCourseTitle(item.title);

  // ★ここが「map の中で使う」場所
  const { ja, en } = splitJaEnSubtitle(item.subtitle);

  const href = item.anchor ? { pathname: "/menu", hash: item.anchor } : "/menu";

  return (
    <div
      key={item.title}
      className={["inline-block text-center", 'font-["Noto_Serif_JP","Yu_Mincho","Hiragino_Mincho_ProN",serif]'].join(" ")}
    >
      <Link
        href={href}
        className="inline-block select-none rounded-[2px] px-2 py-1 cursor-pointer"
        draggable={false}
      >
        <div className="space-y-2">

          <p className={menuCardText.subtitleWrap}>
            <span className={menuCardText.subtitleJa}>{ja}</span>
            {en && (
              <span
                className={`menu-sub-en ${menuCardText.subtitleEn} ${tangerine.className}`}
              >
                {en}
              </span>
            )}
          </p>

          <div className="flex items-baseline justify-center gap-x-4 whitespace-nowrap">
            <span className={menuCardText.title}>{main}</span>
            {count && <span className={menuCardText.meta}>{count}</span>}
            {price && <span className={menuCardText.meta}>{price}</span>}
          </div>

          <p className={menuCardText.desc}>{item.description}</p>
        </div>
      </Link>
    </div>
  );
})}

  {(() => {
    const { main, count, price } = splitCourseTitle(DRINK_MENU.title);
    const { ja, en } = splitJaEnSubtitle(DRINK_MENU.subtitle);
    const drinkHref = { pathname: "/menu", hash: "drink" };

    return (
      <Link
        href={drinkHref}
        className={[
          "inline-block px-2 py-1 text-center cursor-pointer select-none",
          'font-["Noto_Serif_JP","Yu_Mincho","Hiragino_Mincho_ProN",serif]',
        ].join(" ")}
        draggable={false}
      >
        <div className="space-y-2">
          <p className={menuCardText.subtitleWrap}>
            <span className={menuCardText.subtitleJa}>{ja}</span>
            {en && (
              <span className={`menu-sub-en ${menuCardText.subtitleEn} ${tangerine.className}`}>
                {en}
              </span>
            )}
          </p>

          <div className="flex items-baseline justify-center gap-x-4 whitespace-nowrap">
            <span className={menuCardText.title}>{main}</span>
            {count && <span className={menuCardText.meta}>{count}</span>}
            {price && <span className={menuCardText.meta}>{price}</span>}
          </div>

          <p className={menuCardText.desc}>{DRINK_MENU.description}</p>
        </div>
      </Link>
    );
  })()}
</div>
        <div className="mx-auto mt-10 max-w-3xl text-center text-[#2f1b0f]">
          <div
            style={{
              transform: `translate(${infoPos.group.x}px, ${infoPos.group.y}px)`,
            }}
          >
            <p
              className="text-sm font-semibold tracking-[0.18em]"
              style={{ transform: `translate(${infoPos.heading.x}px, ${infoPos.heading.y}px)` }}
            >
              ご案内
            </p>
          <p
            className="mt-3 text-sm leading-relaxed text-[#4a3121]"
            style={{ transform: `translate(${infoPos.body.x}px, ${infoPos.body.y}px)` }}
          >
            表示されている総額は、本体価格に消費税が含まれております。
            アレルギー等のお食事制限がございましたら、お気軽にお申し付けください。
            また、予告なくメニュー内容に変更が生じる場合がございますので、ご了承ください。
          </p>
          <p
            className="mt-6 text-sm font-semibold tracking-[0.12em]"
            style={{ transform: `translate(${infoPos.subheading.x}px, ${infoPos.subheading.y}px)` }}
          >
            アレルギー・食事制限について
          </p>
          <p
            className="mt-2 text-sm leading-relaxed text-[#4a3121]"
            style={{ transform: `translate(${infoPos.subbody.x}px, ${infoPos.subbody.y}px)` }}
          >
            事前にお申し付けください。可能な限りご対応させていただきます。
          </p>
          </div>
        </div>
      </section>

      <GoldDivider fullBleed shiftY={220} className="mb-6" />

      <section
        className="mt-20 pb-24"
        style={{ paddingBottom: `calc(6rem + ${contactSpacing.extraBottom}px)` }}
      >
        <div className="mx-auto grid max-w-5xl items-start gap-8 md:grid-cols-[1fr_1.2fr]">
          <div
            style={{
              transform: `translate(${contactPos.group.x}px, ${contactPos.group.y}px)`,
            }}
          >
          <div className="space-y-4 text-[#2f1b0f]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b68c5a]">
              Contact & Access
            </p>
            <h2 className="text-2xl font-semibold">アクセス / お問い合わせ</h2>
            <p className="text-sm text-[#4a3121]">〒350-0824 埼玉県川越市石原町１丁目４７−７</p>
            <p className="text-sm text-[#4a3121]">
              連絡先：{" "}
              <a className="underline" href="tel:09098297614">
                090-9829-7614
              </a>
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/info"
                className="inline-flex h-9 items-center rounded-[2px] border border-[#c7a357] bg-gradient-to-b from-[#e6d0a2] to-[#d2ab66] px-5 text-[11px] font-medium tracking-[0.18em] text-[#2f1b0f] shadow-[0_1px_0_rgba(0,0,0,0.06)] transition hover:brightness-[1.03] active:brightness-[0.98]"
              >
                アクセス
              </Link>
              <a
                href="tel:09098297614"
                className="inline-flex h-9 items-center rounded-[2px] border border-[#c7a357] bg-white px-5 text-[11px] font-medium tracking-[0.18em] text-[#2f1b0f] shadow-[0_1px_0_rgba(0,0,0,0.06)] transition hover:bg-[#f8f2e6] active:brightness-[0.98]"
              >
                お問い合わせ
              </a>
            </div>
          </div>
          </div>
          <div
            className="overflow-hidden rounded-2xl border border-[#cfa96d]/40 shadow-sm"
            style={{ transform: `translate(${contactPos.map.x}px, ${contactPos.map.y}px)` }}
          >
            <iframe
              title="Bistro Cent Quatre map"
              className="h-64 w-full md:h-[340px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=%E3%80%92350-0824%20%E5%9F%BC%E7%8E%89%E7%9C%8C%E5%B7%9D%E8%B6%8A%E5%B8%82%E7%9F%B3%E5%8E%9F%E7%94%BA%EF%BC%91%E4%B8%81%E7%9B%AE%EF%BC%94%EF%BC%97%E2%88%92%EF%BC%97&output=embed"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

