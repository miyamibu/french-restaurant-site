"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Tangerine } from "next/font/google";

const tangerine = Tangerine({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const TOP_GAP_PX = 110;
const SLIDESHOW_INTERVAL_MS = 4000;
const COURSE_ANCHOR_SCROLL_MARGIN_PX = TOP_GAP_PX + 56;
const DRINK_SECTION_SCROLL_MARGIN_PX = 76; // about 2cm from top
const courseTitleSize = { base: 28, md: 60 };
const menuHeadingSize = { base: 32, md: 60 };

// Size tuning points: update these numbers to tweak horizontal/vertical sizing quickly.
const LAYOUT_SIZE = {
  desktopLeftPercent: 30,
  // +value widens left column, -value narrows left column.
  leftWidthOffsetPercent: 40,
  desktopRightPercent: 68,
  // +value widens right column, -value narrows right column.
  rightWidthOffsetPercent: 0,
  desktopGapPx: 0,
  // -value moves the left column further to the left on desktop.
  leftColumnOffsetPx: -210,
  // -value moves right slideshow column to the left on desktop.
  rightColumnOffsetPx: -200,
};

const ACCORDION_SIZE = {
  // Applies to desktop as well (no md override), so edits are always visible.
  paddingX: 50,
  paddingY: 10,
  rowMinHeight: 14,
  labelSize: 50,
  labelOffsetX: -10,
  labelOffsetY: 0,
  labelLetterSpacingEm: 0.08,
  symbolSize: 50,
  symbolHitArea: 44,
  symbolOffsetX: 0,
  symbolOffsetY: -1,
};

const SLIDESHOW_SIZE = {
  topPx: TOP_GAP_PX,
  // Bottom space for desktop right slideshow area.
  bottomGapPx: 24,
  radiusPx: 50,
};

type MenuSection = "course" | "drink" | "a-la-carte" | "sweets";

const accordionSections: Array<{ key: MenuSection; label: string }> = [
  { key: "course", label: "コース" },
  { key: "a-la-carte", label: "アラカルト" },
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

const aLaCarteMenu = {
  title: "A la carte",
  photos: ["/photos/料理/１.jpg", "/photos/料理/２.jpg", "/photos/料理/３.jpg", "/photos/料理/４.jpg"],
};

const sweetsMenu = {
  title: "SWEETS",
  description:
    "食後に楽しめるデザートをご用意しています。季節により内容が変わる場合があります。",
  photos: ["/photos/extract_1~2.png", "/photos/extract_2~2.png"],
};

export default function MenuPage() {
  const [openSection, setOpenSection] = useState<MenuSection | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const leftColumnPercent = Math.min(
    70,
    Math.max(30, LAYOUT_SIZE.desktopLeftPercent + LAYOUT_SIZE.leftWidthOffsetPercent)
  );
  const rightColumnPercent = Math.min(
    70,
    Math.max(30, LAYOUT_SIZE.desktopRightPercent + LAYOUT_SIZE.rightWidthOffsetPercent)
  );

  useEffect(() => {
    if (slideshowPhotos.length < 2) return;

    const timerId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slideshowPhotos.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    if (!hash) return;

    const isCourseAnchor = courseAnchorIds.has(hash);
    const isSectionAnchor = sectionAnchorKeys.has(hash as MenuSection);
    if (!isCourseAnchor && !isSectionAnchor) return;

    // Open target accordion first, then run scroll alignment in the next effect pass.
    if (isCourseAnchor && openSection !== "course") {
      setOpenSection("course");
      return;
    }
    if (isSectionAnchor && openSection !== hash) {
      setOpenSection(hash as MenuSection);
      return;
    }

    const getScrollOffset = () => {
      if (isCourseAnchor) return COURSE_ANCHOR_SCROLL_MARGIN_PX;
      if (hash === "drink") return DRINK_SECTION_SCROLL_MARGIN_PX;
      return COURSE_ANCHOR_SCROLL_MARGIN_PX;
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
  }, [openSection]);

  const toggleSection = (section: MenuSection) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <div
      className="relative min-h-screen"
      style={{
        "--menu-top-gap": `${TOP_GAP_PX}px`,
        "--menu-columns-desktop": `${leftColumnPercent}% ${rightColumnPercent}%`,
        "--menu-desktop-gap": `${LAYOUT_SIZE.desktopGapPx}px`,
        "--menu-left-column-offset": `${LAYOUT_SIZE.leftColumnOffsetPx}px`,
        "--menu-right-column-offset": `${LAYOUT_SIZE.rightColumnOffsetPx}px`,
        "--menu-accordion-px": `${ACCORDION_SIZE.paddingX}px`,
        "--menu-accordion-py": `${ACCORDION_SIZE.paddingY}px`,
        "--menu-accordion-row-min-h": `${ACCORDION_SIZE.rowMinHeight}px`,
        "--menu-accordion-label-size": `${ACCORDION_SIZE.labelSize}px`,
        "--menu-accordion-label-x": `${ACCORDION_SIZE.labelOffsetX}px`,
        "--menu-accordion-label-y": `${ACCORDION_SIZE.labelOffsetY}px`,
        "--menu-accordion-label-tracking": `${ACCORDION_SIZE.labelLetterSpacingEm}em`,
        "--menu-accordion-symbol-size": `${ACCORDION_SIZE.symbolSize}px`,
        "--menu-accordion-symbol-hit-area": `${ACCORDION_SIZE.symbolHitArea}px`,
        "--menu-accordion-symbol-x": `${ACCORDION_SIZE.symbolOffsetX}px`,
        "--menu-accordion-symbol-y": `${ACCORDION_SIZE.symbolOffsetY}px`,
        "--menu-slide-top": `${SLIDESHOW_SIZE.topPx}px`,
        "--menu-slide-bottom-gap": `${SLIDESHOW_SIZE.bottomGapPx}px`,
        "--menu-slide-height": `calc(100vh - var(--menu-slide-top) - var(--menu-slide-bottom-gap))`,
        "--menu-slide-radius": `${SLIDESHOW_SIZE.radiusPx}px`,
      } as Record<string, string>}
    >
      <div className="relative z-10 px-4 pb-16 md:pb-[var(--menu-slide-bottom-gap)]" style={{ paddingTop: `${TOP_GAP_PX}px` }}>
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
          <section className="md:pr-2 md:[transform:translateX(var(--menu-left-column-offset))]">
            <div className="space-y-4 pb-2 md:pb-12">
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
                          : COURSE_ANCHOR_SCROLL_MARGIN_PX
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
                          className="pointer-events-none absolute left-1/2 top-1/2 inline-block font-semibold text-[#c6b317]"
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
                            width: "var(--menu-accordion-symbol-hit-area)",
                            height: "var(--menu-accordion-symbol-hit-area)",
                            fontSize: "var(--menu-accordion-symbol-size)",
                            transform: "translate(var(--menu-accordion-symbol-x), var(--menu-accordion-symbol-y))",
                          }}
                        >
                          {isOpen ? "-" : "+"}
                        </span>
                      </button>
                    </h2>

                    {isOpen && (
                      <div id={panelId} role="region" aria-labelledby={triggerId} className="pt-6">
                        {section.key === "course" && (
                          <div className="space-y-12">
                            {courseMenus.map((course) => (
                              <article
                                key={course.id}
                                id={course.id}
                                className="space-y-6"
                                style={{ scrollMarginTop: `${COURSE_ANCHOR_SCROLL_MARGIN_PX}px` }}
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

                        {section.key === "a-la-carte" && (
                          <div className="space-y-6">
                            <h3
                              className={`menu-course-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
                              style={{
                                    "--course-title-size": `${courseTitleSize.base}px`,
                                    "--course-title-size-md": `${courseTitleSize.md}px`,
                                  } as Record<string, string>}
                            >
                              {aLaCarteMenu.title}
                            </h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              {aLaCarteMenu.photos.map((src, index) => (
                                <div
                                  key={`a-la-carte-${index}`}
                                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#cfa96d]/40 bg-white shadow-sm"
                                >
                                  <Image
                                    src={src}
                                    alt={`A la carte ${index + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
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

          <aside className="relative hidden overflow-hidden rounded-[var(--menu-slide-radius)] border border-[#cfa96d]/40 bg-[#f4efe6] shadow-sm md:sticky md:top-[var(--menu-slide-top)] md:block md:h-[var(--menu-slide-height)] md:[transform:translateX(var(--menu-right-column-offset))]">
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
