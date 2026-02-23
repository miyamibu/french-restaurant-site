import { addMonths, format, isAfter, isBefore, startOfDay } from "date-fns";

export const JST_TZ = "Asia/Tokyo";
export const MAX_MONTH_AHEAD = 3;

export function todayJst(): Date {
  const now = new Date();
  const utcMs = now.getTime();
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jstDate = new Date(utcMs + jstOffsetMs);
  return startOfDay(jstDate);
}

export function jstDateFromString(date: string): Date {
  return startOfDay(new Date(`${date}T00:00:00+09:00`));
}

export function formatJst(date: Date): string {
  return format(date, "yyyy-MM-dd");
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