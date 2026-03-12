"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDefaultArrivalTimeForCourse,
  getReservationSlotGroups,
  inferReservationServicePeriodFromArrivalTime,
  inferReservationServicePeriodFromCourse,
  isArrivalTimeAllowed,
  isClosedReservationWeekday,
  normalizeReservationDateInput,
} from "@/lib/booking-rules";
import { CONTACT_PHONE_DISPLAY, CONTACT_MESSAGE, CONTACT_TEL_LINK } from "@/lib/contact";
import {
  getReservationCoursesForServicePeriod,
  RESERVATION_CONFIG,
  type ReservationServicePeriodKey,
} from "@/lib/reservation-config";
import {
  addJstMonths,
  formatJstMonth,
  formatJstMonthDay,
  getDaysInJstMonth,
  getJstDateKey,
  getJstDayOfMonth,
  getJstMonthKey,
  getJstWeekday,
  getJstYearMonthParts,
  jstDateFromString,
  startOfJstMonth,
  todayJst,
} from "@/lib/dates";
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
  try {
    const parsed = jstDateFromString(normalized);
    return Number.isNaN(parsed.getTime()) ? fallback : normalized;
  } catch {
    return fallback;
  }
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
  const inferredFromArrivalTime = inferReservationServicePeriodFromArrivalTime(arrivalTime);
  if (inferredFromArrivalTime) {
    return inferredFromArrivalTime;
  }

  const inferredFromCourse = inferReservationServicePeriodFromCourse(course);
  if (inferredFromCourse) {
    return inferredFromCourse;
  }

  if (value === "LUNCH" || value === "DINNER") {
    return value;
  }

  return "LUNCH";
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
    startOfJstMonth(jstDateFromString(defaultDate))
  );
  const [monthlyAvailability, setMonthlyAvailability] = useState<MonthlyAvailabilityMap>({});

  const partyMin = 1;
  const partyMax = RESERVATION_CONFIG.maxPartySize;
  const selectedDate = useMemo(() => jstDateFromString(form.date), [form.date]);
  const today = useMemo(() => todayJst(), []);
  const currentServicePeriod = useMemo(
    () =>
      inferReservationServicePeriodFromArrivalTime(form.arrivalTime) ??
      inferReservationServicePeriodFromCourse(form.course) ??
      selectedInitialServicePeriod,
    [form.arrivalTime, form.course, selectedInitialServicePeriod]
  );
  const courseOptions = useMemo(
    () => getReservationCoursesForServicePeriod(currentServicePeriod),
    [currentServicePeriod]
  );
  const arrivalTimeOptions = useMemo(
    () =>
      getReservationSlotGroups().flatMap((group) =>
        group.slots.map((time) => ({
          value: time,
          label: `${group.label} ${time}`,
        }))
      ),
    []
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
      month: getJstMonthKey(startOfJstMonth(monthStartDate)),
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
      setCalendarMonth(startOfJstMonth(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    const fallbackCourse = courseOptions[0]?.value ?? "";
    const nextCourse = courseOptions.some((option) => option.value === form.course)
      ? form.course
      : fallbackCourse;
    const nextArrivalTime = isArrivalTimeAllowed(form.arrivalTime, undefined, currentServicePeriod)
      ? form.arrivalTime
      : getDefaultArrivalTimeForCourse(undefined, currentServicePeriod);

    if (nextCourse === form.course && nextArrivalTime === form.arrivalTime) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      course: nextCourse,
      arrivalTime: nextArrivalTime,
    }));
  }, [courseOptions, currentServicePeriod, form.arrivalTime, form.course]);

  useEffect(() => {
    let active = true;
    setAvailability((prev) => ({ ...prev, reason: "CHECKING" }));

    loadDailyAvailability(form.date, currentServicePeriod, form.partySize)
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
  }, [currentServicePeriod, form.date, form.partySize]);

  useEffect(() => {
    let active = true;

    loadMonthlyAvailability(calendarMonth, currentServicePeriod, form.partySize)
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
  }, [calendarMonth, currentServicePeriod, form.partySize]);

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
          servicePeriod: currentServicePeriod,
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
          loadDailyAvailability(form.date, currentServicePeriod, form.partySize).catch(
            () => initialAvailability
          ),
          loadMonthlyAvailability(calendarMonth, currentServicePeriod, form.partySize).catch(
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

  const monthStart = startOfJstMonth(calendarMonth);
  const monthDays = getDaysInJstMonth(monthStart);
  const firstWeekday = getJstWeekday(monthStart);
  const calendarDayCircleSize = 28;
  const calendarDayCellWidth = 40;
  const calendarDayMarkerNormalFontSize = 13;
  const calendarDayCallMarkerFontSize = 13;
  const calendarDayMarkerNormalFontWeight = 900;
  const calendarDayCallMarkerFontWeight = 700;
  const calendarDayMarkerShadow =
    "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor";
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
  const cancelInlineMessage = "キャンセルはお電話にてお願いいたします。";
  const cancelInlinePhone = `電話番号：${CONTACT_PHONE_DISPLAY}`;
  const calendarDayMarkerHeight = Math.max(
    calendarDayMarkerNormalFontSize,
    calendarDayCallMarkerFontSize
  ) + 8;
  const calendarDayCellHeight =
    calendarDayCircleSize + calendarDayMarkerTopMargin + calendarDayMarkerHeight;
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: monthDays }, (_, idx) => {
      const { year, month } = getJstYearMonthParts(monthStart);
      const value = getJstDateKey(year, month, idx + 1);
      const dateObj = jstDateFromString(value);
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

      <section className="space-y-4 px-0 py-2 md:p-4">
        <div className="grid gap-6 md:grid-cols-[auto,minmax(0,1fr)] md:items-stretch">
          <div
            className="mx-auto mt-[-0.5cm] w-full max-w-[20.5rem] space-y-4 md:mx-0 md:mt-0 md:max-w-none"
          >
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-[#2f1b0f]">来店日</p>
            </div>

            <div className="mx-auto max-w-[19rem] rounded-md border-0 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => addJstMonths(prev, -1))}
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
                  {formatJstMonth(monthStart)}
                </p>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((prev) => addJstMonths(prev, 1))}
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
                  const cellDay = cell.dateObj;
                  const isSameOrPast = cellDay.getTime() <= today.getTime();
                  const daily = monthlyAvailability[cell.value];
                  const isClosedDay =
                    isClosedReservationWeekday(cellDay) || daily?.reason === "CLOSED";
                  const isDateDisabled =
                    isSameOrPast ||
                    isClosedDay ||
                    (daily != null && nonSelectableReasons.has(daily.reason));

                  let markerText = "";
                  if (isClosedDay) {
                    markerText = "休";
                  } else if (daily?.reason === "PHONE_ONLY") {
                    markerText = "△";
                  } else if (daily?.webBookable) {
                    markerText = "○";
                  }

                  const markerFontSize =
                    markerText === "△"
                      ? calendarDayCallMarkerFontSize
                      : calendarDayMarkerNormalFontSize;
                  const markerFontWeight =
                    markerText === "△"
                      ? calendarDayCallMarkerFontWeight
                      : calendarDayMarkerNormalFontWeight;
                  const markerColor =
                    markerText === "△" || markerText === "休" ? "#b32626" : "#c7a357";

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
                        aria-label={formatJstMonthDay(cell.dateObj)}
                      >
                        {getJstDayOfMonth(cell.dateObj)}
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
                          fontSize: `${markerFontSize}px`,
                          fontWeight: markerFontWeight,
                          lineHeight: `${calendarDayMarkerHeight}px`,
                          textShadow:
                            markerText === "○" || markerText === "△"
                              ? calendarDayMarkerShadow
                              : undefined,
                        }}
                      >
                        {markerText}
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
              className="grid grid-cols-1 md:grid-cols-3"
              style={{
                columnGap: `${rightPanelPairGap}px`,
                rowGap: `${rightPanelPairGap}px`,
                gridTemplateColumns: undefined,
              }}
            >
              <div className="grid min-w-0" style={{ rowGap: `${fieldLabelGap}px` }}>
                <Label htmlFor="time-top">来店時間</Label>
                <select
                  id="time-top"
                  value={form.arrivalTime}
                  onChange={(e) => updateField("arrivalTime", e.target.value)}
                  className="h-10 w-full rounded-md border border-black bg-white px-3 text-sm text-[#2f1b0f] focus:outline-none focus:ring-2 focus:ring-black/20"
                  style={{ borderRadius: `${formFieldRadius}px` }}
                  required
                >
                  {arrivalTimeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid min-w-0" style={{ rowGap: `${fieldLabelGap}px` }}>
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

              <div className="grid min-w-0" style={{ rowGap: `${fieldLabelGap}px` }}>
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

            <div className="space-y-2">
              <Label htmlFor="note">要望（任意）</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => updateField("note", e.target.value)}
                className="min-h-[7.5rem] w-full border-black focus:ring-black/20 focus:border-black md:min-h-[6.5rem]"
                placeholder="アレルギーや記念日のご希望など"
              />
            </div>

            <div className="hidden md:block">
              <div className="space-y-3">
                <div className="flex w-full flex-row flex-wrap items-center justify-end gap-4 text-sm text-[#4a3121]">
                  <p className="min-w-0 whitespace-nowrap">{cancelInlineMessage}</p>
                  <a className="text-left underline whitespace-nowrap" href={CONTACT_TEL_LINK}>
                    {cancelInlinePhone}
                  </a>
                </div>
                <div className="flex w-full justify-end">
                  <button
                    type="submit"
                    className="relative inline-flex shrink-0 -translate-y-[0.2cm] items-center justify-center rounded-full border-0 bg-transparent p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a5a31]/35 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
          </div>
        </div>
      </section>

      {availability.reason === "PHONE_ONLY" ? (
        <p className="rounded-md bg-[#fff7e6] px-4 py-3 text-sm text-[#8f2a2a]">
          △ 電話のみ: この条件のご予約はWebで自動受付しません。店舗で確認しますので
          {availability.callPhone} までお電話ください。
        </p>
      ) : null}

      <div className="mx-auto w-full max-w-[20.5rem] space-y-3 pt-2 md:hidden">
        <div className="flex w-full flex-col items-start gap-y-0.5 text-[12px] leading-tight tracking-[-0.01em] text-[#4a3121] md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-4 md:text-sm md:leading-normal md:tracking-normal">
          <p className="min-w-0 whitespace-nowrap">{cancelInlineMessage}</p>
          <a className="text-left underline md:whitespace-nowrap" href={CONTACT_TEL_LINK}>
            {cancelInlinePhone}
          </a>
        </div>
        <div className="flex w-full justify-end">
          <button
            type="submit"
            className="relative inline-flex shrink-0 translate-y-[-0.5cm] items-center justify-center rounded-full border-0 bg-transparent p-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a5a31]/35 disabled:cursor-not-allowed disabled:opacity-50"
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
