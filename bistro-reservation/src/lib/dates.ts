import { addMonths, isAfter, isBefore, startOfDay } from "date-fns";
import { RESERVATION_CONFIG } from "@/lib/reservation-config";

export const JST_TZ = "Asia/Tokyo";
export const MAX_MONTH_AHEAD = RESERVATION_CONFIG.bookingWindowMonths;

function toJstDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getJstDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const second = parts.find((part) => part.type === "second")?.value ?? "00";

  return { year, month, day, hour, minute, second };
}

export function todayJst(): Date {
  return jstDateFromString(toJstDateString(new Date()));
}

export function nowJst(): Date {
  const { year, month, day, hour, minute, second } = getJstDateTimeParts(new Date());
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`);
}

export function jstDateFromString(date: string): Date {
  return startOfDay(new Date(`${date}T00:00:00+09:00`));
}

export function jstDateTimeFromString(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+09:00`);
}

export function formatJst(date: Date): string {
  return toJstDateString(date);
}

export function isSameOrBeforeToday(date: Date): boolean {
  const today = todayJst();
  return !isAfter(date, today);
}

export function isBeyondRange(date: Date): boolean {
  const today = todayJst();
  const limit = addMonths(today, MAX_MONTH_AHEAD);
  return isAfter(date, limit);
}

export function isAfterOrSameOpeningDate(date: Date): boolean {
  const openingDate = jstDateFromString(RESERVATION_CONFIG.openingDate);
  return !isBefore(date, openingDate);
}

/**
 * Check if a date is a business day (Thursday-Sunday, closed Mon-Wed)
 * 営業日判定：木〜日は営業、月〜水は定休日
 */
export function isBusinessDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  // 0: 日(Sun), 1: 月(Mon), 2: 火(Tue), 3: 水(Wed), 4: 木(Thu), 5: 金(Fri), 6: 土(Sat)
  // Operate Thursday(4) to Sunday(0), closed Monday(1) to Wednesday(3)
  return dayOfWeek === 0 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6;
}

export { addMonths } from "date-fns";
