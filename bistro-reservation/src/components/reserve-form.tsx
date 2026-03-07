"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  format,
  getDate,
  getDay,
  getDaysInMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import LkButton from "@/components/button";
import {
  Select as LkSelect,
  SelectMenu,
  SelectOption,
  SelectTrigger,
} from "@/components/select";
import { CONTACT_PHONE_DISPLAY, CONTACT_MESSAGE, CONTACT_TEL_LINK } from "@/lib/contact";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  defaultDate: string;
  afterAvailabilityNote?: string[];
  initialDate?: string;
  initialPartySize?: string;
  initialCourse?: string;
  initialArrivalTime?: string;
}

interface AvailabilityState {
  bookable: boolean;
  reason: string;
  mainRemaining: number;
  room1Available: boolean;
  room2Available: boolean;
  callPhone: string;
  callMessage: string;
}

type MonthlyAvailabilityMap = Record<string, AvailabilityState | null>;

const courseOptions = [
  {
    group: "ランチ",
    items: [
      { label: "プティラ　Petite La course", value: "ランチ: プティラ　Petite La course" },
      { label: "席のみ", value: "ランチ: 席のみ" },
    ],
  },
  {
    group: "ディナー",
    items: [
      { label: "ジョワ　Joie course", value: "ディナー: ジョワ　Joie course" },
      { label: "サンキャトル　Cent Quatre course", value: "ディナー: サンキャトル　Cent Quatre course" },
      { label: "席のみ", value: "ディナー: 席のみ" },
    ],
  },
];

const flatCourseOptions = courseOptions.flatMap((group) => group.items);

const initialAvailability: AvailabilityState = {
  bookable: false,
  reason: "CHECKING",
  mainRemaining: 0,
  room1Available: false,
  room2Available: false,
  callPhone: CONTACT_PHONE_DISPLAY,
  callMessage: CONTACT_MESSAGE,
};

function sanitizeDate(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : value;
}

function sanitizePartySize(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 2;
  return Math.min(12, Math.max(1, parsed));
}

function sanitizeArrivalTime(value: string | undefined) {
  if (!value) return "";

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return value;
}

export function ReserveForm({
  defaultDate,
  afterAvailabilityNote,
  initialDate,
  initialPartySize,
  initialCourse,
  initialArrivalTime,
}: Props) {
  const defaultCourseValue = courseOptions[0].items[0].value;
  const selectedInitialCourse = flatCourseOptions.some((item) => item.value === initialCourse)
    ? (initialCourse as string)
    : defaultCourseValue;
  const [form, setForm] = useState({
    date: sanitizeDate(initialDate, defaultDate),
    partySize: sanitizePartySize(initialPartySize),
    course: selectedInitialCourse,
    arrivalTime: sanitizeArrivalTime(initialArrivalTime),
    lastName: "",
    firstName: "",
    phone: "",
    note: "",
  });
  const [availability, setAvailability] = useState<AvailabilityState>(initialAvailability);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(parseISO(defaultDate))
  );
  const [monthlyAvailability, setMonthlyAvailability] = useState<MonthlyAvailabilityMap>({});

  useEffect(() => {
    let active = true;
    setAvailability((prev) => ({ ...prev, reason: "CHECKING" }));
    fetch(`/api/availability?date=${form.date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setAvailability(data);
      })
      .catch(() => {
        if (!active) return;
        setAvailability({ ...initialAvailability, reason: "ERROR" });
      });
    return () => {
      active = false;
    };
  }, [form.date]);

  const partyMin = 1;
  const partyMax = 12;
  const selectedDate = useMemo(() => parseISO(form.date), [form.date]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"] as const;

  useEffect(() => {
    if (!Number.isNaN(selectedDate.getTime())) {
      setCalendarMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    let active = true;
    const monthStart = startOfMonth(calendarMonth);
    const monthKey = format(monthStart, "yyyy-MM");

    fetch(`/api/availability/monthly?month=${monthKey}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = (await response.json()) as {
          month?: string;
          days?: MonthlyAvailabilityMap;
        };
        return payload.days ?? null;
      })
      .then((days) => {
        if (!active) return;
        setMonthlyAvailability(days ?? {});
      })
      .catch(() => {
        if (!active) return;
        setMonthlyAvailability({});
      });

    return () => {
      active = false;
    };
  }, [calendarMonth]);

  function updateField<T extends keyof typeof form>(key: T, value: (typeof form)[T]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeoutMs = 20000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fullName = `${form.lastName} ${form.firstName}`.trim();
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          date: form.date,
          course: form.course,
          phone: form.phone,
          name: fullName,
          note: [form.course ? `コース: ${form.course}` : null, form.note].filter(Boolean).join("\n") || undefined,
          partySize: Number(form.partySize),
          arrivalTime: form.arrivalTime || undefined,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data.summary ?? "ご予約を受け付けました。");
      } else {
        setError(data.reason ?? "予約に失敗しました。お電話ください。");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("通信がタイムアウトしました。時間をおいて再度お試しください。");
      } else {
        setError("通信エラーが発生しました。お電話ください。");
      }
    } finally {
      clearTimeout(timeoutId);
      setSubmitting(false);
    }
  }

  const selectedCourseLabel = useMemo(
    () =>
      flatCourseOptions.find((item) => item.value === form.course)?.label ??
      "コースを選択",
    [form.course]
  );
  const monthStart = startOfMonth(calendarMonth);
  const monthDays = getDaysInMonth(monthStart);
  const firstWeekday = getDay(monthStart);
  const mainCapacity = 12;
  const calendarDayCircleSize = 28;
  const calendarDayCellWidth = 34;
  const calendarDayMarkerNormalFontSize = 12;
  const calendarDayCallMarkerFontSize = 10;
  const calendarDayMarkerSymbolSize = 13;
  const calendarDayMarkerSymbolStrokeWidth = 2.2;
  const calendarDayMarkerNormalFontWeight = 900;
  const calendarDayCallMarkerFontWeight = 700;
  const calendarDayMarkerTopMargin = 8;
  const calendarDayGapX = 3;
  const calendarDayGapY = 3;
  const calendarMonthNavButtonSize = 36;
  const calendarMonthNavArrowFontSize = 28;
  const calendarMonthNavArrowFontWeight = 600;
  const calendarMonthNavArrowOffsetY = "-0.1cm";
  const formFieldRadius = 6;
  const reserveButtonKnobWidth = 92;
  const reserveButtonKnobHeight = 52;
  const reserveButtonBorderWidth = 2;
  const reserveButtonOffsetX = 0;
  const reserveButtonOffsetY = "-0.5cm";
  const rightPanelSectionGap = 50;
  const rightPanelPairGap = 12;
  const fieldLabelGap = 6;
  const infoInlineFontSize = 13;
  const infoInlineLead = "貸し切りは10名以上でお申し込みください。";
  const infoInlineMessage = "当日も席が空いている場合がありますのでご連絡いただけたらと思います。";
  const cancelInlineMessage = "キャンセルはお電話にてお願いいたします。";
  const cancelInlinePhone = `電話番号：${CONTACT_PHONE_DISPLAY}`;
  const toCssLength = (value: number | string) => (typeof value === "number" ? `${value}px` : value);
  const calendarDayMarkerHeight =
    Math.max(
      calendarDayMarkerNormalFontSize,
      calendarDayCallMarkerFontSize,
      calendarDayMarkerSymbolSize
    ) + 4;
  const calendarDayCellHeight =
    calendarDayCircleSize + calendarDayMarkerTopMargin + calendarDayMarkerHeight;
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: monthDays }, (_, idx) => {
      const dateObj = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        idx + 1
      );
      const value = format(dateObj, "yyyy-MM-dd");
      return { value, dateObj };
    }),
  ];

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-6 space-y-4">
      {afterAvailabilityNote?.length ? (
        <div className="space-y-2 rounded-xl border border-[#cfa96d]/50 bg-[#fff7e6] px-4 py-3 text-sm leading-6 text-[#4a3121]">
          {afterAvailabilityNote.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}

      <section className="p-4">
        <div className="grid gap-6 md:grid-cols-[auto,minmax(0,1fr)] md:items-stretch">
          <div className="-ml-[38px] -mt-[0.5cm] space-y-4 md:ml-0 md:mt-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#2f1b0f]">来店日</p>
              <div className="rounded-md border-0 bg-white px-3 py-2 text-sm text-[#2f1b0f]">
                {format(selectedDate, "M月d日（E）", { locale: ja })}
              </div>
            </div>

            <div className="rounded-md border-0 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                  className="rounded-md border-0 text-[#4a3121] leading-none hover:bg-[#f8f2e6]"
                  style={{
                    width: `${calendarMonthNavButtonSize}px`,
                    height: `${calendarMonthNavButtonSize}px`,
                    fontSize: `${calendarMonthNavArrowFontSize}px`,
                    fontWeight: calendarMonthNavArrowFontWeight,
                    transform: `translateY(${calendarMonthNavArrowOffsetY})`,
                  }}
                  aria-label="前月へ"
                >
                  ‹
                </button>
                <p className="text-base font-semibold text-[#2f1b0f]">
                  {format(monthStart, "yyyy年M月")}
                </p>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                  className="rounded-md border-0 text-[#4a3121] leading-none hover:bg-[#f8f2e6]"
                  style={{
                    width: `${calendarMonthNavButtonSize}px`,
                    height: `${calendarMonthNavButtonSize}px`,
                    fontSize: `${calendarMonthNavArrowFontSize}px`,
                    fontWeight: calendarMonthNavArrowFontWeight,
                    transform: `translateY(${calendarMonthNavArrowOffsetY})`,
                  }}
                  aria-label="次月へ"
                >
                  ›
                </button>
              </div>

              <div
                className="grid text-center text-xs text-[#7b6b5b]"
                style={{
                  gridTemplateColumns: `repeat(7, ${calendarDayCellWidth}px)`,
                  columnGap: `${calendarDayGapX}px`,
                  justifyContent: "center",
                }}
              >
                {dayLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div
                className="mt-1 grid"
                style={{
                  gridTemplateColumns: `repeat(7, ${calendarDayCellWidth}px)`,
                  columnGap: `${calendarDayGapX}px`,
                  rowGap: `${calendarDayGapY}px`,
                  justifyContent: "center",
                }}
              >
                {calendarCells.map((cell, idx) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        style={{
                          width: `${calendarDayCellWidth}px`,
                          height: `${calendarDayCellHeight}px`,
                        }}
                      />
                    );
                  }

                  const isSelected = cell.value === form.date;
                  const cellDay = startOfDay(cell.dateObj);
                  const isTodayCell = cellDay.getTime() === today.getTime();
                  const isPastCell = cellDay.getTime() < today.getTime();
                  const isSameOrPast = cellDay.getTime() <= today.getTime();
                  const daily = monthlyAvailability[cell.value];
                  const isClosedDay = daily?.reason === "CLOSED";
                  const isDateDisabled = isSameOrPast || isClosedDay;
                  const reservedCount =
                    daily == null ? 0 : Math.max(0, mainCapacity - daily.mainRemaining);

                  let markerText = "";
                  if (isTodayCell) {
                    markerText = "電話";
                  } else if (!isPastCell) {
                    if (!daily) {
                      markerText = "○";
                    } else if (!daily.bookable || daily.reason !== "OK") {
                      markerText = "電話";
                    } else {
                      markerText = reservedCount <= 10 ? "○" : "△";
                    }
                  }

                  const markerFontSize =
                    markerText === "電話"
                      ? calendarDayCallMarkerFontSize
                      : calendarDayMarkerNormalFontSize;
                  const markerFontWeight =
                    markerText === "電話"
                      ? calendarDayCallMarkerFontWeight
                      : calendarDayMarkerNormalFontWeight;
                  const markerColor = markerText === "電話" ? "#b32626" : "#c7a357";
                  const markerIsSymbol = markerText === "○" || markerText === "△";

                  return (
                    <div
                      key={cell.value}
                      className="flex flex-col items-center justify-start"
                      style={{
                        width: `${calendarDayCellWidth}px`,
                        height: `${calendarDayCellHeight}px`,
                      }}
                    >
                      <button
                        type="button"
                        disabled={isDateDisabled}
                        onClick={() => updateField("date", cell.value)}
                        className={[
                          "rounded-full text-sm transition",
                          isSelected
                            ? "bg-[#d8b16a] text-[#2f1b0f] font-semibold"
                            : "text-[#4a3121] hover:bg-[#f8f2e6]",
                          isDateDisabled
                            ? "cursor-not-allowed opacity-35 hover:bg-transparent"
                            : "cursor-pointer",
                        ].join(" ")}
                        style={{
                          width: `${calendarDayCircleSize}px`,
                          height: `${calendarDayCircleSize}px`,
                        }}
                        aria-label={`${format(cell.dateObj, "M月d日")}`}
                      >
                        {getDate(cell.dateObj)}
                      </button>
                      <span
                        className="block w-full select-none text-center"
                        style={{
                          height: `${calendarDayMarkerHeight}px`,
                          marginTop: `${calendarDayMarkerTopMargin}px`,
                          color: markerColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: markerIsSymbol ? undefined : `${markerFontSize}px`,
                          fontWeight: markerIsSymbol ? undefined : markerFontWeight,
                          lineHeight: markerIsSymbol
                            ? undefined
                            : `${calendarDayMarkerHeight}px`,
                        }}
                      >
                        {markerText === "○" && (
                          <svg
                            aria-hidden
                            width={calendarDayMarkerSymbolSize}
                            height={calendarDayMarkerSymbolSize}
                            viewBox="0 0 16 16"
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="5.8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={calendarDayMarkerSymbolStrokeWidth}
                            />
                          </svg>
                        )}
                        {markerText === "△" && (
                          <svg
                            aria-hidden
                            width={calendarDayMarkerSymbolSize}
                            height={calendarDayMarkerSymbolSize}
                            viewBox="0 0 16 16"
                          >
                            <polygon
                              points="8,1.8 13,12.8 3,12.8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={calendarDayMarkerSymbolStrokeWidth}
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {markerText !== "○" && markerText !== "△" && markerText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="-ml-[38px] flex h-full flex-col md:ml-0" style={{ rowGap: `${rightPanelSectionGap}px` }}>
            <div
              className="whitespace-pre-line rounded-md border-0 bg-white px-3 py-2 text-[#6f5b46]"
              style={{ fontSize: `${infoInlineFontSize}px` }}
            >
              <p className="whitespace-nowrap">{infoInlineLead}</p>
              <p>{infoInlineMessage}</p>
            </div>

            <div
              className="grid sm:grid-cols-2"
              style={{ columnGap: `${rightPanelPairGap}px`, rowGap: `${rightPanelPairGap}px` }}
            >
              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="party-top">人数</Label>
                <select
                  id="party-top"
                  value={form.partySize}
                  onChange={(e) => updateField("partySize", Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                  required
                >
                  {Array.from(
                    { length: partyMax - partyMin + 1 },
                    (_, i) => partyMin + i
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}名
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="time-top">来店時間</Label>
                <Input
                  id="time-top"
                  type="time"
                  value={form.arrivalTime}
                  onChange={(e) => updateField("arrivalTime", e.target.value)}
                  min="17:30"
                  className="border-black focus:ring-black/20 focus:border-black"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                />
              </div>
            </div>

            <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
              <Label>コース</Label>
              <LkSelect
                name="course"
                value={form.course}
                options={flatCourseOptions}
                onChange={(e) => updateField("course", e.target.value)}
              >
                <SelectTrigger>
                  <LkButton
                    label={selectedCourseLabel}
                    variant="fill"
                    color="surface"
                    endIcon="chevrons-up-down"
                    aria-label="コースを選択"
                    modifiers="h-10 w-full justify-between px-4 py-2 text-left text-[14px]"
                    style={{
                      backgroundColor: "#ffffff",
                      color: "#1f2937",
                      border: "1px solid #000000",
                      borderRadius: `${formFieldRadius}px`,
                    }}
                  />
                </SelectTrigger>
                <SelectMenu
                  cardProps={{
                    variant: "fill",
                    bgColor: "surface",
                    scaleFactor: "body",
                    className:
                      "select-menu-solid min-w-[280px] max-h-[18rem] overflow-auto border border-black text-[#1f2937]",
                    style: { borderRadius: `${formFieldRadius}px` },
                  }}
                >
                  {courseOptions.map((group) => (
                    <div key={group.group} className="px-2 py-1">
                      <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-gray-500">
                        {group.group}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <SelectOption key={item.value} value={item.value}>
                            <span className="text-sm text-gray-800">{item.label}</span>
                          </SelectOption>
                        ))}
                      </div>
                    </div>
                  ))}
                </SelectMenu>
              </LkSelect>
            </div>

            <div
              className="grid sm:grid-cols-2"
              style={{ columnGap: `${rightPanelPairGap}px`, rowGap: `${rightPanelPairGap}px` }}
            >
              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="last-name">氏名</Label>
                <div className="grid grid-cols-2" style={{ columnGap: `${rightPanelPairGap}px` }}>
                  <Input
                    id="last-name"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="border-black focus:ring-black/20 focus:border-black"
                    style={{ borderRadius: `${formFieldRadius}px` }}
                    placeholder="姓"
                    required
                  />
                  <Input
                    id="first-name"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="border-black focus:ring-black/20 focus:border-black"
                    style={{ borderRadius: `${formFieldRadius}px` }}
                    placeholder="名"
                    required
                  />
                </div>
              </div>
              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="border-black focus:ring-black/20 focus:border-black"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="-ml-[22px] space-y-2 md:ml-0">
        <Label htmlFor="note">要望（任意）</Label>
        <Textarea
          id="note"
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          className="w-[calc(100%+23px)] border-black focus:ring-black/20 focus:border-black md:w-full"
          placeholder="アレルギーや記念日のご希望など"
        />
      </div>

      <div className="-ml-[38px] space-y-3 pr-[38px] pt-2 md:ml-0 md:pr-0">
        <div className="ml-4 flex w-[calc(100%-16px)] flex-col items-start gap-y-0.5 text-[12px] leading-tight tracking-[-0.01em] text-[#4a3121] md:ml-0 md:w-full md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-4 md:text-sm md:leading-normal md:tracking-normal">
          <p className="min-w-0 whitespace-nowrap">{cancelInlineMessage}</p>
          <a
            className="text-left underline md:whitespace-nowrap"
            href={CONTACT_TEL_LINK}
          >
            {cancelInlinePhone}
          </a>
        </div>
        <div className="ml-4 flex w-[calc(100%+45px)] justify-end md:ml-0 md:w-full">
          <button
            type="submit"
            className="relative inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a5a31]/35 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              width: `${reserveButtonKnobWidth}px`,
              height: `${reserveButtonKnobHeight}px`,
              transform: `translate(${toCssLength(reserveButtonOffsetX)}, ${toCssLength(reserveButtonOffsetY)})`,
            }}
            disabled={
              submitting ||
              availability.reason === "SAME_DAY_BLOCKED" ||
              availability.reason === "OUT_OF_RANGE"
            }
            aria-label={submitting ? "送信中..." : "予約する"}
          >
            <span
              className="inline-flex items-center justify-center rounded-[26px] bg-gradient-to-b from-[#fffdfa] via-[#f7f2ea] to-[#efe6da]"
              style={{
                width: `${reserveButtonKnobWidth}px`,
                height: `${reserveButtonKnobHeight}px`,
                border: `${reserveButtonBorderWidth}px solid #8f6a39`,
              }}
            >
              <span className="text-base font-semibold tracking-wide text-[#7a5528] md:text-lg">
                {submitting ? "送信中" : "予約"}
              </span>
            </span>
          </button>
        </div>
      </div>

      {result && <p className="text-green-700 text-sm">{result}</p>}
      {error && <p className="text-red-700 text-sm">{error}</p>}
    </form>
  );
}
