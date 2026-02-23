import { addMonths, isAfter, startOfDay } from "date-fns";

export const JST_TZ = "Asia/Tokyo";
export const MAX_MONTH_AHEAD = 3;

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

export function todayJst(): Date {
  return jstDateFromString(toJstDateString(new Date()));
}

export function jstDateFromString(date: string): Date {
  return startOfDay(new Date(`${date}T00:00:00+09:00`));
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
