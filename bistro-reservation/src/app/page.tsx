/* eslint-disable react/no-unescaped-entities */
"use client";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Tangerine } from "next/font/google";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL_LINK } from "@/lib/contact";
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

function splitIntoAlternatingColumns<T>(items: T[], pattern: number[]) {
  const columns: T[][] = [];
  let start = 0;
  let patternIndex = 0;

  while (start < items.length) {
    const size = pattern[patternIndex % pattern.length] ?? 1;
    columns.push(items.slice(start, start + size));
    start += size;
    patternIndex += 1;
  }

  return columns;
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
const dishPhotoRows = splitIntoAlternatingColumns(dishPhotos, [2, 3]);
const dishPhotoCardWidthPx = 360; // 2列時と3列時の中間サイズ
const dishPhotoGapPx = 24; // gap-6 と同じ間隔

function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  distancePx = 34,
  durationMs = 780,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  distancePx?: number;
  durationMs?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : distancePx}px)`,
        transitionProperty: "opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        transitionDelay: `${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

function GoldDivider({
  fullBleed = false,
  shiftY = 0,
  thickness = 40,
  blendTopOnPhoto = false,
  centerOpacity,
  colorRgb = "200,153,77",
  className = "",}: {
  fullBleed?: boolean;
  shiftY?: number;
  thickness?: number;
  blendTopOnPhoto?: boolean;
  centerOpacity?: number;
  colorRgb?: string;
  className?: string;}) { return (
    (() => {
      const safeThickness = Math.max(8, thickness);
      const fadePx = Math.max(6, Math.round(safeThickness * 0.35));
      const bandHeight = safeThickness + fadePx * 2;
      const bandHalf = Math.round(safeThickness / 2);
      const topFadeOpacity = blendTopOnPhoto ? 0.24 : 0.42;
      const centerFadeOpacity =
        centerOpacity ?? (blendTopOnPhoto ? 0.88 : 0.96);
      const bottomFadeOpacity = blendTopOnPhoto ? 0.24 : 0.42;
      const topFadeStep = blendTopOnPhoto ? Math.max(4, Math.round(fadePx * 0.65)) : fadePx;

      return (
    <div
      className={(fullBleed
          ? "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen"
          : "mx-auto max-w-5xl") +" px-0 overflow-visible " + 
      className}>
  <div
  style={{
    transform: `translateY(${shiftY}px)`,
    height: `${Math.max(56, bandHeight + 12)}px`,
  }}
  className="relative overflow-visible">
  <div
    className="absolute inset-x-0 top-1/2 -translate-y-1/2"
    style={{
      height: `${bandHeight}px`,
      background:
        `linear-gradient(to bottom,
          rgba(${colorRgb},0) 0px,
          rgba(${colorRgb},${topFadeOpacity}) ${topFadeStep}px,
          rgba(${colorRgb},${centerFadeOpacity}) ${fadePx + bandHalf}px,
          rgba(${colorRgb},${bottomFadeOpacity}) ${fadePx + safeThickness}px,
          rgba(${colorRgb},0) ${bandHeight}px
        )`,
    }}
  />
</div>
    </div>
      );
    })()
  );}

export default function HomePage() {
const readMoreBtnPos = {
  x: 0,   // 右に+ / 左に-
  y: 550, // 下に+ / 上に-
};
const goldDividerPos = {
  thicknessBase: 44, // 帯の基準太さ(px)
  thicknessAll: 0,   // 全帯の太さを一括微調整(+/-)
  heroBottomThickness: 0, // ヒーロー直下の帯の太さ微調整
  heroBottomCenterOpacity: 1, // ヒーロー直下の帯の中心濃度(0-1)
  heroBottomColorRgb: "184,136,56", // ヒーロー直下の帯色（濃いゴールド）
  readMoreThickness: 0,   // READ MORE下の帯の太さ微調整
  dishesThickness: 0,     // DISHES下の帯の太さ微調整
  contactTopThickness: 0, // CONTACT上の帯の太さ微調整
  showDivider2: false, // 2本目（READ MORE-DISHES間）を一時表示するか
  showDivider3: false, // 3本目（DISHES-MENU間）を一時表示するか
  showDivider4: false, // 4本目（CONTACT上）を一時表示するか
  divider1Y: -42,      // 1本目: ヒーロー直下の帯（下に+ / 上に-）
  divider2Y: 130,      // 2本目: READ MORE と DISHES の間の帯
  divider3Y: 120,      // 3本目: DISHES と MENU の間の帯
  divider4Y: 180,      // 4本目: CONTACT 上の帯
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
  group: { x: -285, y: -90 },
  label: { x: 0, y: 0 },
  title: { x: 0, y: 0 },
  body: { x: 0, y: 0 },
};
const infoPos = {
  group: { x: 0, y:100 },
  heading: { x: 0, y: 0 },
  body: { x: 0, y: 0 },
  subheading: { x: 0, y: 0 },
  subbody: { x: 0, y: 0 },
};
const contactPos = {
  group: { x:0, y:300 },
  map: { x: 52, y:300 },
};
const contactSpacing = {
  extraBottom: 76, // 下余白の微調整(px) / 約2cm
};
const sectionBackgroundTone = {
  white: "#ffffff",
  accent: "#F3E5AB",
};
const sectionBlendPx = 220;
const dishesBoundaryLiftPx = 114; // 約3cmぶん上に移動
const dishesBlendPx = Math.max(0, sectionBlendPx - dishesBoundaryLiftPx);
const sectionBackgroundGradient = {
  dishes: `linear-gradient(to bottom, ${sectionBackgroundTone.white} 0px, ${sectionBackgroundTone.accent} ${dishesBlendPx}px, ${sectionBackgroundTone.accent} 100%)`,
  menu: `linear-gradient(to bottom, ${sectionBackgroundTone.accent} 0px, ${sectionBackgroundTone.white} ${sectionBlendPx}px, ${sectionBackgroundTone.white} 100%)`,
  contact: `linear-gradient(to bottom, ${sectionBackgroundTone.white} 0px, ${sectionBackgroundTone.accent} ${sectionBlendPx}px, ${sectionBackgroundTone.accent} 100%)`,
};
const contactOffsetCompensation = Math.max(0, contactPos.group.y, contactPos.map.y);
const dishesSpacing = { top: 120 }; // DISHES セクション全体の下げ幅(px)
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
  <>
  <div className="relative z-10 space-y-0">
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

	      <ScrollReveal>
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
	<GoldDivider
  fullBleed
  blendTopOnPhoto
  centerOpacity={goldDividerPos.heroBottomCenterOpacity}
  colorRgb={goldDividerPos.heroBottomColorRgb}
  thickness={
    goldDividerPos.thicknessBase +
    goldDividerPos.thicknessAll +
    goldDividerPos.heroBottomThickness
  }
  shiftY={goldDividerPos.divider1Y}
	  className="mb-6"
	/>
	      </ScrollReveal>

	      <ScrollReveal delayMs={80}>
	<section className="mt-0 pt-[150px] space-y-6 text-center">
  <div className="mx-auto flex w-full max-w-5xl justify-center">
    <Link
      href="/menu"
      style={{
        transform: `translate(${readMoreBtnPos.x}px, ${readMoreBtnPos.y}px)`,
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
    <div className="space-y-3 text-center">
      <div className="relative w-[260px] md:w-[350px] h-[220px] md:h-[300px] translate-x-[-200px] translate-y-[-120px]">
        <Image
          src="/photos/2.png"
          alt="Bistro Cent Quatre"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div
        className="text-center"
        style={{ transform: `translate(${storyPos.group.x}px, ${storyPos.group.y}px)` }}
      >
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
	      </ScrollReveal>

	      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
	      <div
	        style={{
	          background: sectionBackgroundGradient.dishes,
	        }}
	      >
	      <ScrollReveal delayMs={100}>
		<GoldDivider
  fullBleed
  thickness={
    goldDividerPos.thicknessBase +
    goldDividerPos.thicknessAll +
    goldDividerPos.readMoreThickness
  }
  shiftY={goldDividerPos.divider2Y}
		  className={`mb-6 ${goldDividerPos.showDivider2 ? "" : "hidden"}`}
		/>
	      </ScrollReveal>

	      <ScrollReveal delayMs={120}>
		{/* 料理セクション：READ MORE と メニューの間 */}
		<section
  className="mt-0 pt-[110px] pb-[30px] text-center"
  style={{ marginTop: `${dishesSpacing.top}px` }}
>
  <div className="mx-auto max-w-[1240px] px-4">
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-[#b68c5a]">DISHES</p>
      <h2 className="text-3xl font-semibold text-[#2f1b0f]">料理</h2>
    </div>

    <div className="mt-10 space-y-6">
      {(() => {
        let revealIndex = 0;
        return dishPhotoRows.map((row, rowIndex) => (
          <div
            key={`dish-row-${rowIndex}`}
            className="mx-auto grid w-full gap-6"
            style={{
              maxWidth: `calc(${row.length} * ${dishPhotoCardWidthPx}px + ${(row.length - 1) * dishPhotoGapPx}px)`,
              gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
            }}
          >
            {row.map((p, itemIndex) => {
              const delayMs = revealIndex * 140;
              revealIndex += 1;
              return (
                <ScrollReveal
                  key={`${p.src}-${rowIndex}-${itemIndex}`}
                  delayMs={delayMs}
                  distancePx={20}
                  durationMs={980}
                >
                  <button
                    type="button"
                    onClick={() => setLightbox(p)}
                    aria-label={`${p.alt} を拡大`}
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-md cursor-utensils focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a357]/40"
                  >
                    <Image
                      src={p.src}
                      alt={p.alt}
                      fill
                      className="object-cover"
                      sizes={`(max-width: 768px) ${Math.floor(100 / row.length)}vw, ${dishPhotoCardWidthPx}px`}
                    />
                  </button>
                </ScrollReveal>
              );
            })}
          </div>
        ));
      })()}
    </div>
  </div>
		</section>
		      </ScrollReveal>

	      <ScrollReveal delayMs={140}>
		<GoldDivider
	  fullBleed
	  thickness={
	    goldDividerPos.thicknessBase +
	    goldDividerPos.thicknessAll +
	    goldDividerPos.dishesThickness
	  }
	  shiftY={goldDividerPos.divider3Y}
		  className={`mb-6 ${goldDividerPos.showDivider3 ? "" : "hidden"}`}
		/>
		      </ScrollReveal>
	      </div>

	      <div
	        style={{
	          background: sectionBackgroundGradient.menu,
	        }}
	      >
	      <ScrollReveal delayMs={160} durationMs={1200} distancePx={28}>
	      <section className="mt-0 pt-[145px] space-y-6 text-center menu-no-select">
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
  {activeMenu.slides.map((item, index) => {
  const { main, count, price } = splitCourseTitle(item.title);

  // ★ここが「map の中で使う」場所
  const { ja, en } = splitJaEnSubtitle(item.subtitle);

  const href = item.anchor ? { pathname: "/menu", hash: item.anchor } : "/menu";

  return (
    <ScrollReveal
      key={item.title}
      delayMs={index * 140}
      distancePx={16}
      durationMs={920}
    >
      <div
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
    </ScrollReveal>
  );
})}

  {(() => {
    const { main, count, price } = splitCourseTitle(DRINK_MENU.title);
    const { ja, en } = splitJaEnSubtitle(DRINK_MENU.subtitle);
    const drinkHref = "/menu#drink";

    return (
      <ScrollReveal
        key={`drink-${menuKind}`}
        delayMs={activeMenu.slides.length * 140}
        distancePx={16}
        durationMs={920}
      >
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
      </ScrollReveal>
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
              className="text-base md:text-lg font-semibold tracking-[0.18em]"
              style={{ transform: `translate(${infoPos.heading.x}px, ${infoPos.heading.y}px)` }}
            >
              ご案内
            </p>
          <p
            className="mt-3 text-base md:text-lg leading-relaxed text-[#4a3121]"
            style={{ transform: `translate(${infoPos.body.x}px, ${infoPos.body.y}px)` }}
          >
            表示されている総額は、本体価格に消費税が含まれております。
            アレルギー等のお食事制限がございましたら、お気軽にお申し付けください。
            また、予告なくメニュー内容に変更が生じる場合がございますので、
            <span className="whitespace-nowrap">ご了承ください。</span>
          </p>
          <p
            className="mt-6 text-base md:text-lg font-semibold tracking-[0.12em]"
            style={{ transform: `translate(${infoPos.subheading.x}px, ${infoPos.subheading.y}px)` }}
          >
            アレルギー・食事制限について
          </p>
          <p
            className="mt-2 text-base md:text-lg leading-relaxed text-[#4a3121]"
            style={{ transform: `translate(${infoPos.subbody.x}px, ${infoPos.subbody.y}px)` }}
          >
            事前にお申し付けください。可能な限りご対応させていただきます。
          </p>
          </div>
        </div>
		      </section>
		      </ScrollReveal>
	      </div>

	      <div
	        style={{
	          background: sectionBackgroundGradient.contact,
	        }}
	      >
	      <GoldDivider
	        fullBleed
	        thickness={
	          goldDividerPos.thicknessBase +
	          goldDividerPos.thicknessAll +
	          goldDividerPos.contactTopThickness
	        }
	        shiftY={goldDividerPos.divider4Y}
	        className={`mb-6 ${goldDividerPos.showDivider4 ? "" : "hidden"}`}
	      />

	      <ScrollReveal delayMs={180}>
	      <section
	        className="mt-20 pb-24"
	        style={{
	          paddingBottom: `${
	            contactSpacing.extraBottom + contactOffsetCompensation
	          }px`,
	        }}
	      >
        <div className="mx-auto grid w-full max-w-[900px] items-start gap-4 md:gap-0 md:grid-cols-[0.9fr_1fr]">
          <div
            className="md:flex md:h-[340px] md:items-center"
            style={{
              transform: `translate(${contactPos.group.x}px, ${contactPos.group.y}px)`,
            }}
          >
          <div className="text-[#2f1b0f]">
            <div className="flex flex-col gap-5 md:h-[190px] md:justify-between md:gap-0">
              <h2 className="text-3xl font-semibold">アクセス / お問い合わせ</h2>
              <p className="text-lg font-semibold text-black">〒350-0824 埼玉県川越市石原町１丁目４７−７</p>
              <div className="flex flex-wrap items-center gap-3 text-lg font-semibold text-black">
                <span>連絡先：</span>
                <a className="underline font-bold text-black" href={CONTACT_TEL_LINK}>
                  {CONTACT_PHONE_DISPLAY}
                </a>
                <a
                  href={CONTACT_TEL_LINK}
                  className="inline-flex h-10 items-center rounded-full border border-[#c7a357] bg-white px-6 text-[12px] font-medium tracking-[0.18em] text-[#2f1b0f] shadow-[0_1px_0_rgba(0,0,0,0.06)] transition hover:bg-[#f8f2e6] active:brightness-[0.98]"
                >
                  お問い合わせ
                </a>
              </div>
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
	      </ScrollReveal>
	      </div>
	      </div>
  </div>
  </>
);
}
