"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Tangerine } from "next/font/google";

const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const TOP_GAP_PX = 110;
const MOBILE_TOP_GAP_REDUCTION_PX = 45;
const SLIDESHOW_INTERVAL_MS = 4000;
const DRINK_SECTION_SCROLL_MARGIN_PX = 76; // about 2cm from top
const courseTitleSize = { base: 28, md: 60 };
const menuHeadingSize = { base: 32, md: 60 };

// Size tuning points: update these numbers to tweak horizontal/vertical sizing quickly.
const LAYOUT_SIZE = {
  desktopLeftPercent: 30,
  // +value widens left column, -value narrows left column.
  leftWidthOffsetPercent: 30,
  desktopRightPercent: 68,
  // +value widens right column, -value narrows right column.
  rightWidthOffsetPercent: 0,
  desktopGapPx: 0,
  // Group move for left column.
  leftColumnOffsetXPx: -140,
  leftColumnOffsetYPx: 0,
  // Group move for right slideshow.
  rightColumnOffsetXPx: 10,
  rightColumnOffsetYPx: 0,
};

const LEFT_COLUMN_VERTICAL_SIZE = {
  // Vertical spacing between accordion blocks.
  itemGapYPx: 16,
  // Bottom breathing room for the whole left-column block.
  blockPaddingBottomMobilePx: 8,
  blockPaddingBottomDesktopPx: 48,
  // Per-accordion vertical sizing.
  accordionPaddingYPx: 10,
  triggerMinHeightPx: 14,
};

const ACCORDION_SIZE = {
  // Applies to desktop as well (no md override), so edits are always visible.
  paddingX: 50,
  labelSize: 50,
  labelOffsetX: -10,
  labelOffsetY: 0,
  labelLetterSpacingEm: 0.08,
};

const PLUS_BUTTON_SIZE = {
  sizePx: 50,
  hitAreaPx: 44,
  offsetXPx: 0,
  offsetYPx: -1,
};

const SLIDESHOW_SIZE = {
  topPx: TOP_GAP_PX,
  // Bottom space for desktop right slideshow area.
  bottomGapPx: 24,
  radiusPx: 50,
};

const MOBILE_MENU_LAYOUT = {
  itemGapYPx: 18,
  blockPaddingBottomPx: 20,
  accordionPaddingXPx: 18,
  accordionPaddingYPx: 14,
  accordionRowMinHeightPx: 50,
  accordionLabelSizePx: 29,
  accordionLabelOffsetXPx: 0,
  accordionLabelOffsetYPx: -1,
  accordionLabelLetterSpacingEm: 0.04,
  plusSizePx: 34,
  plusHitAreaPx: 36,
  plusOffsetXPx: 0,
  plusOffsetYPx: -1,
};

type MenuSection = "course" | "drink" | "sweets";

const accordionSections: Array<{ key: MenuSection; label: string }> = [
  { key: "course", label: "コース" },
  { key: "sweets", label: "スイーツ" },
  { key: "drink", label: "ドリンク" },
];

const slideshowPhotos = [
  "/photos/qu.jpg",
  "/photos/jo.jpg",
  "/photos/料理/３.jpg",
  "/photos/料理/５.jpg",
  "/photos/extract_1~2.png",
  "/photos/extract_2~2.png",
];

const courseMenus = [
  {
    id: "petite",
    title: "Petite La course",
    photos: ["/photos/pu.jpg", "/photos/jo.jpg", "/photos/qu.jpg", "/photos/am.jpg"],
  },
  {
    id: "joie",
    title: "Joie course",
    photos: ["/photos/jo.jpg", "/photos/pu.jpg", "/photos/qu.jpg", "/photos/am.jpg", "/photos/po.png"],
  },
  {
    id: "cent-quatre",
    title: "Cent Quatre course",
    photos: ["/photos/qu.jpg", "/photos/jo.jpg", "/photos/pu.jpg", "/photos/am.jpg", "/photos/extract_1~2.png", "/photos/extract_2~2.png"],
  },
];

const courseAnchorIds = new Set(courseMenus.map((course) => course.id));
const sectionAnchorKeys = new Set(accordionSections.map((section) => section.key));

const drinkMenu = {
  title: "Alcohol",
  description:
    "グラスワイン、ボトル、カクテルを中心にご用意しています。",
  photos: ["/photos/料理/５.jpg", "/photos/料理/６.jpg"],
};

const nonAlcoholMenu = {
  title: "Non Alcohol",
  description:
    "ノンアルコールワイン、スパークリング、ソフトドリンクも充実しています。",
  photos: ["/photos/am.jpg", "/photos/mo.png"],
};

const sweetsMenu = {
  title: "SWEETS",
  description:
    "食後に楽しめるデザートをご用意しています。季節により内容が変わる場合があります。",
  photos: ["/photos/extract_1~2.png", "/photos/extract_2~2.png"],
};

function useIsMobileLayout(breakpointPx = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsMobile(mediaQuery.matches);

    onChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [breakpointPx]);

  return isMobile;
}

export default function MenuPage() {
  const isMobileLayout = useIsMobileLayout();
  const [openSection, setOpenSection] = useState<MenuSection | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeHash, setActiveHash] = useState("");
  const topGapPx = isMobileLayout
    ? Math.max(0, TOP_GAP_PX - MOBILE_TOP_GAP_REDUCTION_PX)
    : TOP_GAP_PX;
  const courseAnchorScrollMarginPx = topGapPx + 56;
  const leftColumnPercent = Math.min(
    70,
    Math.max(30, LAYOUT_SIZE.desktopLeftPercent + LAYOUT_SIZE.leftWidthOffsetPercent)
  );
  const rightColumnPercent = Math.min(
    70,
    Math.max(30, LAYOUT_SIZE.desktopRightPercent + LAYOUT_SIZE.rightWidthOffsetPercent)
  );
  const itemGapYPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.itemGapYPx
    : LEFT_COLUMN_VERTICAL_SIZE.itemGapYPx;
  const blockPaddingBottomMobilePx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.blockPaddingBottomPx
    : LEFT_COLUMN_VERTICAL_SIZE.blockPaddingBottomMobilePx;
  const accordionPaddingXPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionPaddingXPx
    : ACCORDION_SIZE.paddingX;
  const accordionPaddingYPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionPaddingYPx
    : LEFT_COLUMN_VERTICAL_SIZE.accordionPaddingYPx;
  const accordionRowMinHeightPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionRowMinHeightPx
    : LEFT_COLUMN_VERTICAL_SIZE.triggerMinHeightPx;
  const accordionLabelSizePx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionLabelSizePx
    : ACCORDION_SIZE.labelSize;
  const accordionLabelOffsetXPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionLabelOffsetXPx
    : ACCORDION_SIZE.labelOffsetX;
  const accordionLabelOffsetYPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionLabelOffsetYPx
    : ACCORDION_SIZE.labelOffsetY;
  const accordionLabelLetterSpacingEm = isMobileLayout
    ? MOBILE_MENU_LAYOUT.accordionLabelLetterSpacingEm
    : ACCORDION_SIZE.labelLetterSpacingEm;
  const plusSizePx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.plusSizePx
    : PLUS_BUTTON_SIZE.sizePx;
  const plusHitAreaPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.plusHitAreaPx
    : PLUS_BUTTON_SIZE.hitAreaPx;
  const plusOffsetXPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.plusOffsetXPx
    : PLUS_BUTTON_SIZE.offsetXPx;
  const plusOffsetYPx = isMobileLayout
    ? MOBILE_MENU_LAYOUT.plusOffsetYPx
    : PLUS_BUTTON_SIZE.offsetYPx;

  useEffect(() => {
    if (isMobileLayout || slideshowPhotos.length < 2) return;

    const timerId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slideshowPhotos.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isMobileLayout]);

  useEffect(() => {
    const syncHash = () => {
      const nextHash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
      setActiveHash(nextHash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    const hash = activeHash;
    if (!hash) return;

    const isCourseAnchor = courseAnchorIds.has(hash);
    const isSectionAnchor = sectionAnchorKeys.has(hash as MenuSection);
    if (!isCourseAnchor && !isSectionAnchor) return;

    // Open target accordion on hash change, then retry scrolling until target is measurable.
    if (isCourseAnchor) setOpenSection("course");
    if (isSectionAnchor) setOpenSection(hash as MenuSection);

    const getScrollOffset = () => {
      if (isCourseAnchor) return courseAnchorScrollMarginPx;
      if (hash === "drink") return DRINK_SECTION_SCROLL_MARGIN_PX;
      return courseAnchorScrollMarginPx;
    };

    const scrollToTarget = (behavior: ScrollBehavior = "auto") => {
      const target = document.getElementById(hash);
      if (!target) return false;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const nextTop = Math.max(0, targetTop - getScrollOffset());
      window.scrollTo({ top: nextTop, behavior });
      return true;
    };

    let attempts = 0;
    const maxAttempts = isSectionAnchor ? 10 : 12;
    scrollToTarget("auto");

    const retryTimerId = window.setInterval(() => {
      attempts += 1;
      if (scrollToTarget("auto") || attempts >= maxAttempts) {
        window.clearInterval(retryTimerId);
      }
    }, isSectionAnchor ? 80 : 60);

    return () => window.clearInterval(retryTimerId);
  }, [activeHash, courseAnchorScrollMarginPx]);

  const toggleSection = (section: MenuSection) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <div
      className="relative min-h-screen"
      style={{
        marginTop: isMobileLayout ? "calc(var(--header-h) * -1)" : "0px",
        "--menu-top-gap": `${topGapPx}px`,
        "--menu-columns-desktop": `${leftColumnPercent}% ${rightColumnPercent}%`,
        "--menu-desktop-gap": `${LAYOUT_SIZE.desktopGapPx}px`,
        "--menu-left-column-offset-x": `${LAYOUT_SIZE.leftColumnOffsetXPx}px`,
        "--menu-left-column-offset-y": `${LAYOUT_SIZE.leftColumnOffsetYPx}px`,
        "--menu-right-column-offset-x": `${LAYOUT_SIZE.rightColumnOffsetXPx}px`,
        "--menu-right-column-offset-y": `${LAYOUT_SIZE.rightColumnOffsetYPx}px`,
        "--menu-left-column-item-gap-y": `${itemGapYPx}px`,
        "--menu-left-column-pb-mobile": `${blockPaddingBottomMobilePx}px`,
        "--menu-left-column-pb-desktop": `${LEFT_COLUMN_VERTICAL_SIZE.blockPaddingBottomDesktopPx}px`,
        "--menu-accordion-px": `${accordionPaddingXPx}px`,
        "--menu-accordion-py": `${accordionPaddingYPx}px`,
        "--menu-accordion-row-min-h": `${accordionRowMinHeightPx}px`,
        "--menu-accordion-label-size": `${accordionLabelSizePx}px`,
        "--menu-accordion-label-x": `${accordionLabelOffsetXPx}px`,
        "--menu-accordion-label-y": `${accordionLabelOffsetYPx}px`,
        "--menu-accordion-label-tracking": `${accordionLabelLetterSpacingEm}em`,
        "--menu-plus-size": `${plusSizePx}px`,
        "--menu-plus-hit-area": `${plusHitAreaPx}px`,
        "--menu-plus-offset-x": `${plusOffsetXPx}px`,
        "--menu-plus-offset-y": `${plusOffsetYPx}px`,
        "--menu-slide-top": `${SLIDESHOW_SIZE.topPx}px`,
        "--menu-slide-bottom-gap": `${SLIDESHOW_SIZE.bottomGapPx}px`,
        "--menu-slide-height": `calc(100vh - var(--menu-slide-top) - var(--menu-slide-bottom-gap))`,
        "--menu-slide-radius": `${SLIDESHOW_SIZE.radiusPx}px`,
      } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-[#fff9e4] via-[#F3E5AB] to-[#dcc06f]" />
      <div className="relative z-10 px-4 pb-16 md:pb-[var(--menu-slide-bottom-gap)]" style={{ paddingTop: `${topGapPx}px` }}>
        <header className="mb-8 space-y-2 text-center">
          <h1
            className={`menu-heading-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
            style={{
              "--menu-heading-size": `${menuHeadingSize.base}px`,
              "--menu-heading-size-md": `${menuHeadingSize.md}px`,
            } as Record<string, string>}
          >
            Menu
          </h1>
        </header>

        <div
          className="grid grid-cols-1 items-start gap-y-6 md:[grid-template-columns:var(--menu-columns-desktop)]"
          style={{ columnGap: "var(--menu-desktop-gap)" }}
        >
          <section className="mx-auto w-full max-w-[22rem] md:max-w-none md:pr-2 md:[transform:translate(var(--menu-left-column-offset-x),var(--menu-left-column-offset-y))]">
            <div className="flex flex-col gap-[var(--menu-left-column-item-gap-y)] pb-[var(--menu-left-column-pb-mobile)] md:pb-[var(--menu-left-column-pb-desktop)]">
              {accordionSections.map((section) => {
                const isOpen = openSection === section.key;
                const panelId = `${section.key}-panel`;
                const triggerId = `${section.key}-trigger`;

                return (
                  <section
                    key={section.key}
                    id={section.key}
                    className="rounded-2xl border border-[#cfa96d]/40 bg-white/80 px-[var(--menu-accordion-px)] py-[var(--menu-accordion-py)] shadow-sm"
                    style={{
                      scrollMarginTop: `${
                        section.key === "drink"
                          ? DRINK_SECTION_SCROLL_MARGIN_PX
                          : courseAnchorScrollMarginPx
                      }px`,
                    }}
                  >
                    <h2>
                      <button
                        id={triggerId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleSection(section.key)}
                        className="relative flex w-full min-h-[var(--menu-accordion-row-min-h)] items-center justify-end text-left"
                      >
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 inline-block whitespace-nowrap font-semibold text-[#c6b317]"
                          style={{
                            fontSize: "var(--menu-accordion-label-size)",
                            letterSpacing: "var(--menu-accordion-label-tracking)",
                            fontFamily: '"Cooper Black", "Cooper Std", "Noto Serif JP", "Yu Mincho", serif',
                            textShadow: "0 1px 0 #2f2f35, 0 2px 0 #2f2f35",
                            transform:
                              "translate(calc(-50% + var(--menu-accordion-label-x)), calc(-50% + var(--menu-accordion-label-y)))",
                          }}
                        >
                          {section.label}
                        </span>
                        <span
                          aria-hidden
                          className="inline-flex items-center justify-center leading-none text-[#2f1b0f]"
                          style={{
                            width: "var(--menu-plus-hit-area)",
                            height: "var(--menu-plus-hit-area)",
                            fontSize: "var(--menu-plus-size)",
                            transform: "translate(var(--menu-plus-offset-x), var(--menu-plus-offset-y))",
                          }}
                        >
                          {isOpen ? "-" : "+"}
                        </span>
                      </button>
                    </h2>

                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        className="pt-5 text-center md:pt-6"
                      >
                        {section.key === "course" && (
                          <div className="space-y-12">
                            {courseMenus.map((course) => (
                              <article
                                key={course.id}
                                id={course.id}
                                className="space-y-6"
                                style={{ scrollMarginTop: `${courseAnchorScrollMarginPx}px` }}
                              >
                                <h3
                                  className={`menu-course-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
                                  style={{
                                    "--course-title-size": `${courseTitleSize.base}px`,
                                    "--course-title-size-md": `${courseTitleSize.md}px`,
                                  } as Record<string, string>}
                                >
                                  {course.title}
                                </h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  {course.photos.map((src, index) => (
                                    <div
                                      key={`${course.id}-${index}`}
                                      className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
                                    >
                                      <Image
                                        src={src}
                                        alt={`${course.title} ${index + 1}`}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </article>
                            ))}
                          </div>
                        )}

                        {section.key === "drink" && (
                          <div className="space-y-10">
                            <div className="space-y-6">
                              <h3
                                className={`menu-course-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
                                style={{
                                    "--course-title-size": `${courseTitleSize.base}px`,
                                    "--course-title-size-md": `${courseTitleSize.md}px`,
                                  } as Record<string, string>}
                              >
                                {drinkMenu.title}
                              </h3>
                              <p className="text-sm leading-relaxed text-[#4a3121] md:text-base">
                                {drinkMenu.description}
                              </p>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {drinkMenu.photos.map((src, index) => (
                                  <div
                                    key={`drink-${index}`}
                                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
                                  >
                                    <Image
                                      src={src}
                                      alt={`Drink menu ${index + 1}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-6 pt-8">
                              <h3
                                className={`menu-course-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
                                style={{
                                    "--course-title-size": `${courseTitleSize.base}px`,
                                    "--course-title-size-md": `${courseTitleSize.md}px`,
                                  } as Record<string, string>}
                              >
                                {nonAlcoholMenu.title}
                              </h3>
                              <p className="text-sm leading-relaxed text-[#4a3121] md:text-base">
                                {nonAlcoholMenu.description}
                              </p>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {nonAlcoholMenu.photos.map((src, index) => (
                                  <div
                                    key={`non-alcohol-${index}`}
                                    className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
                                  >
                                    <Image
                                      src={src}
                                      alt={`Non alcohol ${index + 1}`}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {section.key === "sweets" && (
                          <div className="space-y-6">
                            <h3
                              className={`menu-course-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
                              style={{
                                    "--course-title-size": `${courseTitleSize.base}px`,
                                    "--course-title-size-md": `${courseTitleSize.md}px`,
                                  } as Record<string, string>}
                            >
                              {sweetsMenu.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-[#4a3121] md:text-base">
                              {sweetsMenu.description}
                            </p>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {sweetsMenu.photos.map((src, index) => (
                                <div
                                  key={`sweets-${index}`}
                                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
                                >
                                  <Image
                                    src={src}
                                    alt={`Sweets ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>

          <aside className="relative hidden overflow-hidden rounded-[var(--menu-slide-radius)] border border-[#cfa96d]/40 bg-[#f4efe6] shadow-sm md:sticky md:top-[var(--menu-slide-top)] md:block md:h-[var(--menu-slide-height)] md:[transform:translate(var(--menu-right-column-offset-x),var(--menu-right-column-offset-y))]">
            {slideshowPhotos.map((src, index) => {
              const isActive = index === activeSlideIndex;

              return (
                <div
                  key={src}
                  className={`absolute inset-0 transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`}
                >
                  <Image
                    src={src}
                    alt={`Menu slideshow ${index + 1}`}
                    fill
                    className="object-cover"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
                </div>
              );
            })}

            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {slideshowPhotos.map((_, index) => (
                <span
                  key={`dot-${index}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeSlideIndex ? "w-6 bg-white" : "w-1.5 bg-white/70"
                  }`}
                />
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
