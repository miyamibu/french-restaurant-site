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
import {
  getAllowedArrivalTimesForServicePeriod,
  getDefaultArrivalTimeForCourse,
  getReservationServiceLabel,
  inferReservationServicePeriodFromArrivalTime,
  inferReservationServicePeriodFromCourse,
  isArrivalTimeAllowed,
  isClosedReservationWeekday,
  normalizeReservationDateInput,
} from "@/lib/booking-rules";
import { CONTACT_PHONE_DISPLAY, CONTACT_MESSAGE, CONTACT_TEL_LINK } from "@/lib/contact";
import {
  getReservationCoursesForServicePeriod,
  RESERVATION_BUSINESS_HOURS_TEXT,
  RESERVATION_CLOSED_TEXT,
  RESERVATION_CONFIG,
  RESERVATION_CUTOFF_TEXT,
  RESERVATION_WEB_HOURS_TEXT,
  type ReservationServicePeriodKey,
} from "@/lib/reservation-config";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  defaultDate: string;
  afterAvailabilityNote?: string[];
  initialDate?: string;
  initialServicePeriod?: string;
  initialPartySize?: string;
  initialCourse?: string;
  initialArrivalTime?: string;
}

interface AvailabilityState {
  webBookable: boolean;
  reason: string;
  callPhone: string;
  callMessage: string;
}

type MonthlyAvailabilityMap = Record<string, AvailabilityState | null>;

const initialAvailability: AvailabilityState = {
  webBookable: false,
  reason: "CHECKING",
  callPhone: CONTACT_PHONE_DISPLAY,
  callMessage: CONTACT_MESSAGE,
};

const nonSelectableReasons = new Set([
  "BEFORE_OPENING",
  "OUT_OF_RANGE",
  "CLOSED",
  "SAME_DAY_BLOCKED",
  "CUTOFF_PASSED",
]);

function sanitizeDate(value: string | undefined, fallback: string) {
  const normalized = normalizeReservationDateInput(value, fallback);
  const parsed = parseISO(normalized);
  return Number.isNaN(parsed.getTime()) ? fallback : normalized;
}

function sanitizePartySize(value: string | undefined) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 2;
  return Math.min(RESERVATION_CONFIG.maxPartySize, Math.max(1, parsed));
}

function sanitizeServicePeriod(
  value: string | undefined,
  course?: string,
  arrivalTime?: string
): ReservationServicePeriodKey {
  if (value === "LUNCH" || value === "DINNER") {
    return value;
  }

  return (
    inferReservationServicePeriodFromCourse(course) ??
    inferReservationServicePeriodFromArrivalTime(arrivalTime) ??
    "LUNCH"
  );
}

function sanitizeCourse(
  value: string | undefined,
  servicePeriod: ReservationServicePeriodKey
) {
  const options = getReservationCoursesForServicePeriod(servicePeriod);
  if (options.some((option) => option.value === value)) {
    return value as string;
  }

  return options[0]?.value ?? "";
}

function sanitizeArrivalTime(
  value: string | undefined,
  servicePeriod: ReservationServicePeriodKey
) {
  if (value && isArrivalTimeAllowed(value, undefined, servicePeriod)) {
    return value;
  }

  return getDefaultArrivalTimeForCourse(undefined, servicePeriod);
}

export function ReserveForm({
  defaultDate,
  afterAvailabilityNote,
  initialDate,
  initialServicePeriod,
  initialPartySize,
  initialCourse,
  initialArrivalTime,
}: Props) {
  const selectedInitialServicePeriod = sanitizeServicePeriod(
    initialServicePeriod,
    initialCourse,
    initialArrivalTime
  );
  const selectedInitialCourse = sanitizeCourse(initialCourse, selectedInitialServicePeriod);
  const selectedInitialArrivalTime = sanitizeArrivalTime(
    initialArrivalTime,
    selectedInitialServicePeriod
  );

  const [form, setForm] = useState({
    date: sanitizeDate(initialDate, defaultDate),
    servicePeriod: selectedInitialServicePeriod,
    partySize: sanitizePartySize(initialPartySize),
    course: selectedInitialCourse,
    arrivalTime: selectedInitialArrivalTime,
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

  const partyMin = 1;
  const partyMax = RESERVATION_CONFIG.maxPartySize;
  const selectedDate = useMemo(() => parseISO(form.date), [form.date]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const courseOptions = useMemo(
    () => getReservationCoursesForServicePeriod(form.servicePeriod),
    [form.servicePeriod]
  );
  const arrivalTimeOptions = useMemo(
    () => getAllowedArrivalTimesForServicePeriod(form.servicePeriod),
    [form.servicePeriod]
  );
  const serviceLabel = useMemo(
    () => getReservationServiceLabel(undefined, form.servicePeriod),
    [form.servicePeriod]
  );
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"] as const;

  async function loadDailyAvailability(
    date: string,
    servicePeriod: ReservationServicePeriodKey,
    partySize: number
  ) {
    const params = new URLSearchParams({
      date,
      servicePeriod,
      partySize: String(partySize),
    });
    const response = await fetch(`/api/availability?${params.toString()}`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      throw new Error("DAILY_AVAILABILITY_FETCH_FAILED");
    }

    return data as AvailabilityState;
  }

  async function loadMonthlyAvailability(
    monthStartDate: Date,
    servicePeriod: ReservationServicePeriodKey,
    partySize: number
  ) {
    const params = new URLSearchParams({
      month: format(startOfMonth(monthStartDate), "yyyy-MM"),
      servicePeriod,
      partySize: String(partySize),
    });
    const response = await fetch(`/api/availability/monthly?${params.toString()}`);
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.days) {
      throw new Error("MONTHLY_AVAILABILITY_FETCH_FAILED");
    }

    return data.days as MonthlyAvailabilityMap;
  }

  useEffect(() => {
    if (!Number.isNaN(selectedDate.getTime())) {
      setCalendarMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    const fallbackCourse = courseOptions[0]?.value ?? "";
    const nextCourse = courseOptions.some((option) => option.value === form.course)
      ? form.course
      : fallbackCourse;
    const nextArrivalTime = isArrivalTimeAllowed(form.arrivalTime, undefined, form.servicePeriod)
      ? form.arrivalTime
      : getDefaultArrivalTimeForCourse(undefined, form.servicePeriod);

    if (nextCourse === form.course && nextArrivalTime === form.arrivalTime) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      course: nextCourse,
      arrivalTime: nextArrivalTime,
    }));
  }, [courseOptions, form.arrivalTime, form.course, form.servicePeriod]);

  useEffect(() => {
    let active = true;
    setAvailability((prev) => ({ ...prev, reason: "CHECKING" }));

    loadDailyAvailability(form.date, form.servicePeriod, form.partySize)
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
  }, [form.date, form.partySize, form.servicePeriod]);

  useEffect(() => {
    let active = true;

    loadMonthlyAvailability(calendarMonth, form.servicePeriod, form.partySize)
      .then((days) => {
        if (!active) return;
        setMonthlyAvailability(days);
      })
      .catch(() => {
        if (!active) return;
        setMonthlyAvailability({});
      });

    return () => {
      active = false;
    };
  }, [calendarMonth, form.partySize, form.servicePeriod]);

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
          servicePeriod: form.servicePeriod,
          course: form.course,
          phone: form.phone,
          name: fullName,
          note: form.note || undefined,
          partySize: Number(form.partySize),
          arrivalTime: form.arrivalTime,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult(data.summary ?? "ご予約を受け付けました。");
        const [nextDaily, nextMonthly] = await Promise.all([
          loadDailyAvailability(form.date, form.servicePeriod, form.partySize).catch(
            () => initialAvailability
          ),
          loadMonthlyAvailability(calendarMonth, form.servicePeriod, form.partySize).catch(
            () => monthlyAvailability
          ),
        ]);
        setAvailability(nextDaily);
        setMonthlyAvailability(nextMonthly);
      } else {
        setError(data.error ?? data.reason ?? "予約に失敗しました。お電話ください。");
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

  const monthStart = startOfMonth(calendarMonth);
  const monthDays = getDaysInMonth(monthStart);
  const firstWeekday = getDay(monthStart);
  const calendarDayCircleSize = 28;
  const calendarDayCellWidth = 40;
  const calendarDayMarkerNormalFontSize = 12;
  const calendarDayCallMarkerFontSize = 9;
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
  const rightPanelSectionGap = 50;
  const rightPanelPairGap = 12;
  const fieldLabelGap = 6;
  const infoInlineFontSize = 13;
  const infoInlineLead = "時間帯と人数を先に選ぶと、その条件で予約可否を表示します。";
  const infoInlineMessage = "9名以上、または満席に近い枠は自動受付せず、お電話でご相談いただく運用です。";
  const cancelInlineMessage = "キャンセルはお電話にてお願いいたします。";
  const cancelInlinePhone = `電話番号：${CONTACT_PHONE_DISPLAY}`;
  const calendarDayMarkerHeight = Math.max(
    calendarDayMarkerNormalFontSize,
    calendarDayCallMarkerFontSize,
    calendarDayMarkerSymbolSize
  ) + 8;
  const calendarDayCellHeight =
    calendarDayCircleSize + calendarDayMarkerTopMargin + calendarDayMarkerHeight;
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: monthDays }, (_, idx) => {
      const dateObj = new Date(monthStart.getFullYear(), monthStart.getMonth(), idx + 1);
      const value = format(dateObj, "yyyy-MM-dd");
      return { value, dateObj };
    }),
  ];
  const servicePeriodOptions: Array<{
    value: ReservationServicePeriodKey;
    label: string;
  }> = [
    { value: "LUNCH", label: "ランチ" },
    { value: "DINNER", label: "ディナー" },
  ];
  const availabilitySummary =
    availability.reason === "PHONE_ONLY"
      ? "△ 電話のみ"
      : availability.webBookable
        ? "○"
        : "";

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-6 space-y-4">
      {afterAvailabilityNote?.length ? (
        <div className="space-y-2 rounded-xl border border-[#cfa96d]/50 bg-[#fff7e6] px-4 py-3 text-sm leading-6 text-[#4a3121]">
          {afterAvailabilityNote.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}

      <section className="space-y-4 px-0 py-2 md:p-4">
        <div
          className="grid sm:grid-cols-2"
          style={{ columnGap: `${rightPanelPairGap}px`, rowGap: `${rightPanelPairGap}px` }}
        >
          <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
            <Label htmlFor="service-period">時間帯</Label>
            <select
              id="service-period"
              value={form.servicePeriod}
              onChange={(e) =>
                updateField("servicePeriod", e.target.value as ReservationServicePeriodKey)
              }
              className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ borderRadius: `${formFieldRadius}px` }}
              required
            >
              {servicePeriodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
            <Label htmlFor="party-size">人数</Label>
            <select
              id="party-size"
              value={form.partySize}
              onChange={(e) => updateField("partySize", Number(e.target.value))}
              className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
              style={{ borderRadius: `${formFieldRadius}px` }}
              required
            >
              {Array.from({ length: partyMax - partyMin + 1 }, (_, i) => partyMin + i).map(
                (n) => (
                  <option key={n} value={n}>
                    {n}名
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[auto,minmax(0,1fr)] md:items-stretch">
          <div
            className="mx-auto mt-[-0.5cm] w-full max-w-[20.5rem] space-y-4 md:mx-0 md:mt-0 md:max-w-none"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#2f1b0f]">来店日</p>
              <div className="rounded-md border-0 bg-white px-3 py-2 text-right text-sm text-[#2f1b0f]">
                <div>{format(selectedDate, "M月d日（E）", { locale: ja })}</div>
                <div className="text-xs text-[#7b6b5b]">
                  {serviceLabel} / {form.partySize}名 {availabilitySummary ? `/ ${availabilitySummary}` : ""}
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-[19rem] rounded-md border-0 bg-white p-3">
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
                  const isSameOrPast = cellDay.getTime() <= today.getTime();
                  const daily = monthlyAvailability[cell.value];
                  const isClosedDay =
                    isClosedReservationWeekday(cellDay) || daily?.reason === "CLOSED";
                  const isDateDisabled =
                    isSameOrPast ||
                    (daily != null && nonSelectableReasons.has(daily.reason));

                  let markerText = "";
                  if (isClosedDay) {
                    markerText = "休";
                  } else if (daily?.reason === "PHONE_ONLY") {
                    markerText = "電話のみ";
                  } else if (daily?.webBookable) {
                    markerText = "○";
                  }

                  const markerFontSize =
                    markerText === "電話のみ"
                      ? calendarDayCallMarkerFontSize
                      : calendarDayMarkerNormalFontSize;
                  const markerFontWeight =
                    markerText === "電話のみ"
                      ? calendarDayCallMarkerFontWeight
                      : calendarDayMarkerNormalFontWeight;
                  const markerColor =
                    markerText === "電話のみ" || markerText === "休" ? "#b32626" : "#c7a357";
                  const markerIsSymbol = markerText === "○";

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
                          minHeight: `${calendarDayMarkerHeight}px`,
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
                        {markerText === "○" ? (
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
                        ) : (
                          markerText
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="mx-auto flex h-full w-full max-w-[20.5rem] flex-col md:mx-0 md:max-w-none"
            style={{ rowGap: `${rightPanelSectionGap}px` }}
          >
            <div
              className="whitespace-pre-line rounded-md border-0 bg-white px-3 py-2 text-center text-[#6f5b46] md:text-left"
              style={{ fontSize: `${infoInlineFontSize}px` }}
            >
              <p>{infoInlineLead}</p>
              <p>{infoInlineMessage}</p>
              <p>{RESERVATION_BUSINESS_HOURS_TEXT}</p>
              <p>{RESERVATION_WEB_HOURS_TEXT}</p>
              <p className="text-[#b32626]">定休日：{RESERVATION_CLOSED_TEXT}</p>
              <p className="text-[#b32626]">{RESERVATION_CUTOFF_TEXT}</p>
            </div>

            <div
              className="grid grid-cols-2"
              style={{ columnGap: `${rightPanelPairGap}px`, rowGap: `${rightPanelPairGap}px` }}
            >
              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="time-top">来店時間</Label>
                <select
                  id="time-top"
                  value={form.arrivalTime}
                  onChange={(e) => updateField("arrivalTime", e.target.value)}
                  className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                  required
                >
                  {arrivalTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {serviceLabel} {time}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#6f5b46]">
                  {serviceLabel}のWeb予約枠から選択してください。
                </p>
              </div>

              <div className="grid" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="course">コース</Label>
                <select
                  id="course"
                  value={form.course}
                  onChange={(e) => updateField("course", e.target.value)}
                  className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                  required
                >
                  {courseOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
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

      <div className="mx-auto w-full max-w-[20.5rem] space-y-2 md:mx-0 md:max-w-none">
        <Label htmlFor="note">要望（任意）</Label>
        <Textarea
          id="note"
          value={form.note}
          onChange={(e) => updateField("note", e.target.value)}
          className="w-full border-black focus:ring-black/20 focus:border-black"
          placeholder="アレルギーや記念日のご希望など"
        />
      </div>

      {availability.reason === "PHONE_ONLY" ? (
        <p className="rounded-md bg-[#fff7e6] px-4 py-3 text-sm text-[#8f2a2a]">
          △ 電話のみ: この条件のご予約はWebで自動受付しません。店舗で確認しますので
          {availability.callPhone} までお電話ください。
        </p>
      ) : null}

      <div className="mx-auto w-full max-w-[20.5rem] space-y-3 pt-2 md:mx-0 md:max-w-none">
        <div className="flex w-full flex-col items-start gap-y-0.5 text-[12px] leading-tight tracking-[-0.01em] text-[#4a3121] md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-4 md:text-sm md:leading-normal md:tracking-normal">
          <p className="min-w-0 whitespace-nowrap">{cancelInlineMessage}</p>
          <a className="text-left underline md:whitespace-nowrap" href={CONTACT_TEL_LINK}>
            {cancelInlinePhone}
          </a>
        </div>
        <div className="flex w-full justify-end">
          <button
            type="submit"
            className="relative inline-flex shrink-0 translate-y-[-0.5cm] items-center justify-center rounded-full border-0 bg-transparent p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a5a31]/35 disabled:cursor-not-allowed disabled:opacity-50 md:translate-y-[0.5cm]"
            style={{
              width: `${reserveButtonKnobWidth}px`,
              height: `${reserveButtonKnobHeight}px`,
            }}
            disabled={submitting || availability.reason !== "OK"}
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
