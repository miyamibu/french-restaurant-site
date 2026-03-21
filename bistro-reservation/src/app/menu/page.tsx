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
const MOBILE_TOP_GAP_EXTRA_PX = 30; // adds roughly 0.3cm compared with the current mobile spacing
const SLIDESHOW_INTERVAL_MS = 4000;
const menuHeadingSize = { base: 32, md: 60 };

type CourseTabId = "petite" | "joie" | "cent-quatre";

type CourseMenuItem = {
  headingHtml: string;
  note?: string;
  altHtml?: string;
};

type CourseTab = {
  id: CourseTabId;
  label: string;
  title: string;
  items: readonly CourseMenuItem[];
  photos: readonly string[];
};

const courseTabs: readonly CourseTab[] = [
  {
    id: "petite",
    label: "Petite La",
    title: "Petite La course",
    items: [
      {
        headingHtml: '一口前菜<span class="menu-tab-badge">　2 種</span>',
        note: "シェフよりご挨拶の小品",
      },
      {
        headingHtml: '前菜<span class="menu-tab-pill">月替わり</span>',
        altHtml:
          'お好みに合わせて、別の前菜もお選びいただけます<br /><span class="menu-tab-linklike">別の前菜を見る</span>',
      },
      {
        headingHtml: '魚料理<span class="menu-tab-or">または</span>肉料理',
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "コーヒー",
        note: "小菓子を添えて",
      },
    ],
    photos: ["/photos/pu.jpg", "/photos/jo.jpg", "/photos/qu.jpg", "/photos/am.jpg"],
  },
  {
    id: "joie",
    label: "Joie",
    title: "Joie course",
    items: [
      {
        headingHtml: '一口前菜<span class="menu-tab-badge">　3 種</span>',
        note: "シェフよりご挨拶の小品",
      },
      {
        headingHtml: '冷製前菜<span class="menu-tab-pill">月替わり</span>',
        note: "季節の食材を活かした一皿",
        altHtml:
          'お好みに合わせて、別の前菜もお選びいただけます<br /><span class="menu-tab-linklike">別の前菜を見る</span>',
      },
      {
        headingHtml: '温製前菜<span class="menu-tab-pill">月替わり</span>',
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: '魚料理<span class="menu-tab-or">または</span>肉料理',
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "ご飯",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "デザート",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "コーヒー",
        note: "小菓子を添えて",
      },
    ],
    photos: ["/photos/jo.jpg", "/photos/pu.jpg", "/photos/qu.jpg", "/photos/am.jpg", "/photos/po.png"],
  },
  {
    id: "cent-quatre",
    label: "Cent Quatre",
    title: "Cent Quatre course",
    items: [
      {
        headingHtml: '一口前菜<span class="menu-tab-badge">　3 種</span>',
        note: "シェフよりご挨拶の小品",
      },
      {
        headingHtml: '冷製前菜<span class="menu-tab-pill">月替わり</span>',
        note: "季節の食材を活かした一皿",
        altHtml:
          'お好みに合わせて、別の前菜もお選びいただけます<br /><span class="menu-tab-linklike">別の前菜を見る</span>',
      },
      {
        headingHtml: '温製前菜<span class="menu-tab-pill">月替わり</span>',
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "魚料理",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "肉料理",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "ご飯",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "デザート",
        note: "本日の厳選食材をお楽しみください",
      },
      {
        headingHtml: "コーヒー",
        note: "小菓子を添えて",
      },
    ],
    photos: [
      "/photos/qu.jpg",
      "/photos/jo.jpg",
      "/photos/pu.jpg",
      "/photos/am.jpg",
      "/photos/extract_1~2.png",
      "/photos/extract_2~2.png",
    ],
  },
];

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
  const [activeTab, setActiveTab] = useState<CourseTabId>("petite");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const topGapPx = isMobileLayout
    ? Math.max(0, TOP_GAP_PX - MOBILE_TOP_GAP_REDUCTION_PX + MOBILE_TOP_GAP_EXTRA_PX)
    : TOP_GAP_PX;
  const courseAnchorScrollMarginPx = topGapPx + 24;
  const activeCourse = courseTabs.find((course) => course.id === activeTab) ?? courseTabs[0];

  useEffect(() => {
    let firstFrameId = 0;
    let secondFrameId = 0;

    const syncHash = () => {
      const nextHash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
      const matchingCourse = courseTabs.find((course) => course.id === nextHash);

      if (!matchingCourse) return;

      setActiveTab(matchingCourse.id);

      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          document.getElementById(matchingCourse.id)?.scrollIntoView({ block: "start" });
        });
      });
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  useEffect(() => {
    setActiveSlideIndex(0);
  }, [activeTab]);

  useEffect(() => {
    if (isMobileLayout || activeCourse.photos.length < 2) return;

    const timerId = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % activeCourse.photos.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [activeCourse.id, activeCourse.photos.length, isMobileLayout]);

  return (
    <div
      className="relative min-h-screen"
      style={
        {
          marginTop: isMobileLayout ? "calc(var(--header-h) * -1)" : "0px",
          "--menu-top-gap": `${topGapPx}px`,
        } as CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 bg-gradient-to-b from-[#fff9e4] via-[#f3e5ab] to-[#dcc06f]" />

      <div className="relative z-10 px-4 pb-16" style={{ paddingTop: `${topGapPx}px` }}>
        <header className="mb-8 space-y-2 text-center">
          <h1
            className={`menu-heading-title font-semibold text-[#2f1b0f] ${tangerine.className}`}
            style={
              {
                "--menu-heading-size": `${menuHeadingSize.base}px`,
                "--menu-heading-size-md": `${menuHeadingSize.md}px`,
              } as Record<string, string>
            }
          >
            Menu
          </h1>
        </header>

        <section
          className="mx-auto max-w-5xl rounded-[2rem] border border-[#b8975a]/20 px-4 py-4 shadow-[0_24px_80px_rgba(42,32,24,0.18)] md:px-8 md:py-8"
          style={{
            background:
              "radial-gradient(circle at top, rgba(184,151,90,0.14) 0%, rgba(184,151,90,0.05) 26%, transparent 48%), linear-gradient(180deg, rgba(58,44,33,0.98) 0%, rgba(42,32,24,0.99) 48%, rgba(30,23,17,0.99) 100%)",
          }}
        >
          <div className="h-0 overflow-hidden">
            {courseTabs.map((course) => (
              <div
                key={course.id}
                id={course.id}
                className="block h-0"
                style={{ scrollMarginTop: `${courseAnchorScrollMarginPx}px` }}
              />
            ))}
          </div>

          <div
            role="tablist"
            aria-label="メニューコース"
            className="flex flex-wrap gap-3 md:justify-center"
          >
            {courseTabs.map((course) => {
              const isActive = course.id === activeTab;

              return (
                <button
                  key={course.id}
                  id={`${course.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${course.id}-panel`}
                  onClick={() => setActiveTab(course.id)}
                  className={`rounded-full border px-4 py-2 text-sm tracking-[0.08em] transition md:px-6 md:text-base ${
                    isActive
                      ? "border-[#d4b07a] bg-[#f5f0e8] text-[#2a2018]"
                      : "border-[#b8975a]/40 bg-white/5 text-[#f5f0e8] hover:border-[#d4b07a]/70 hover:bg-white/10"
                  }`}
                >
                  {course.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1.08fr)_minmax(19rem,0.92fr)]">
            <article
              id={`${activeCourse.id}-panel`}
              role="tabpanel"
              aria-labelledby={`${activeCourse.id}-tab`}
              className="rounded-[1.75rem] border border-[#b8975a]/18 bg-[#1b1410]/34 px-5 py-6 text-[#f5f0e8] md:px-10 md:py-10"
            >
              <div className="mx-auto max-w-[35rem]">
                <header className="mb-10 text-center">
                  <h2 className='font-["Noto_Serif_JP","Yu_Mincho","Hiragino_Mincho_ProN",serif] text-[1.8rem] font-light tracking-[0.18em] text-[#f5f0e8] md:text-[2.1rem]'>
                    {activeCourse.label}
                  </h2>
                  <div className="mt-5 flex items-center justify-center gap-3 text-[#b8975a]">
                    <span className="h-px w-14 bg-gradient-to-r from-transparent to-current" />
                    <span className="h-[5px] w-[5px] rotate-45 bg-current" />
                    <span className="h-px w-14 bg-gradient-to-l from-transparent to-current" />
                  </div>
                </header>

                <ul className="space-y-0">
                  {activeCourse.items.map((item, index) => (
                    <li
                      key={`${activeCourse.id}-${index}`}
                      className="border-b border-[#b8975a]/20 py-5 last:border-b-0"
                    >
                      <div
                        className="menu-tab-heading relative text-center text-[1.02rem] font-normal leading-[1.55] tracking-[0.12em] text-[#f5f0e8] md:text-[1.08rem]"
                        dangerouslySetInnerHTML={{ __html: item.headingHtml }}
                      />
                      {item.note ? (
                        <p className="mt-1.5 text-center text-[0.72rem] leading-6 tracking-[0.1em] text-[#9a8a77] md:text-[0.76rem]">
                          {item.note}
                        </p>
                      ) : null}
                      {item.altHtml ? (
                        <div
                          className="menu-tab-alt mt-4 border-t border-dashed border-[#b8975a]/20 pt-4 text-center text-[0.69rem] leading-7 tracking-[0.1em] text-[#9a8a77] md:text-[0.73rem]"
                          dangerouslySetInnerHTML={{ __html: item.altHtml }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className="relative hidden overflow-hidden rounded-[1.75rem] border border-[#b8975a]/20 bg-[#1b1410]/34 shadow-[0_24px_80px_rgba(0,0,0,0.16)] md:block md:min-h-[36rem]">
              {activeCourse.photos.map((src, index) => {
                const isActive = index === activeSlideIndex;

                return (
                  <div
                    key={`${activeCourse.id}-${src}`}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`${activeCourse.title} ${index + 1}`}
                      fill
                      className="object-cover"
                      priority={index === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/15" />
                  </div>
                );
              })}

              <div className="absolute inset-x-0 top-0 p-5">
                <p className="inline-flex rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs tracking-[0.18em] text-[#f5f0e8] backdrop-blur-sm">
                  {activeCourse.title}
                </p>
              </div>

              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
                {activeCourse.photos.map((_, index) => (
                  <span
                    key={`${activeCourse.id}-dot-${index}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeSlideIndex ? "w-6 bg-white" : "w-1.5 bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
