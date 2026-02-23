import { ReservationStatus, SeatType } from "@prisma/client";
import { jstDateFromString, isSameOrBeforeToday, isBeyondRange, todayJst } from "@/lib/dates";
import type { PrismaClient } from "@prisma/client";

export type AvailabilityReason =
  | "OK"
  | "SAME_DAY_BLOCKED"
  | "OUT_OF_RANGE"
  | "CLOSED"
  | "FULL"
  | "INVALID_DATE";

export interface AvailabilityResult {
  bookable: boolean;
  reason: AvailabilityReason;
  mainRemaining: number;
  room1Available: boolean;
  room2Available: boolean;
  callPhone: string;
  callMessage: string;
}

export const MAIN_CAPACITY = 12;
export const MIN_ARRIVAL_HOUR = 17;
export const MIN_ARRIVAL_MINUTE = 30;

export async function getAvailability(
  dateStr: string,
  prisma: PrismaClient
): Promise<AvailabilityResult> {
  const callPhone = "09098297614";
  const callMessage = `お電話でお問い合わせください：${callPhone}`;

  let parsed: Date;
  try {
    parsed = jstDateFromString(dateStr);
  } catch (e) {
    return {
      bookable: false,
      reason: "INVALID_DATE",
      mainRemaining: 0,
      room1Available: false,
      room2Available: false,
      callPhone,
      callMessage,
    };
  }

  if (isSameOrBeforeToday(parsed)) {
    return {
      bookable: false,
      reason: "SAME_DAY_BLOCKED",
      mainRemaining: 0,
      room1Available: false,
      room2Available: false,
      callPhone,
      callMessage,
    };
  }

  if (isBeyondRange(parsed)) {
    return {
      bookable: false,
      reason: "OUT_OF_RANGE",
      mainRemaining: 0,
      room1Available: false,
      room2Available: false,
      callPhone,
      callMessage,
    };
  }

  const businessDay = await prisma.businessDay.findUnique({ where: { date: dateStr } });
  if (businessDay?.isClosed) {
    return {
      bookable: false,
      reason: "CLOSED",
      mainRemaining: 0,
      room1Available: false,
      room2Available: false,
      callPhone,
      callMessage,
    };
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      date: dateStr,
      status: ReservationStatus.CONFIRMED,
    },
  });

  const mainUsed = reservations.reduce((sum, r) => sum + r.partySize, 0);
  const hasBanquet = reservations.some((r) => r.partySize >= 10);

  const mainRemaining = Math.max(0, MAIN_CAPACITY - mainUsed);
  const hasAny = !hasBanquet && mainRemaining > 0;

  return {
    bookable: hasAny,
    reason: hasAny ? "OK" : "FULL",
    mainRemaining,
    room1Available: false,
    room2Available: false,
    callPhone,
    callMessage,
  };
}

export function isArrivalTimeValid(arrival?: string | null) {
  if (!arrival) return true;
  const [h, m] = arrival.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h > 23 || m > 59 || h < 0 || m < 0) return false;
  if (h < MIN_ARRIVAL_HOUR) return false;
  if (h === MIN_ARRIVAL_HOUR && m < MIN_ARRIVAL_MINUTE) return false;
  return true;
}

export function isWithinAcceptance(dateStr: string) {
  const d = jstDateFromString(dateStr);
  return !isSameOrBeforeToday(d) && !isBeyondRange(d);
}
