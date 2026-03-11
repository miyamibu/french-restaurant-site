import { ReservationStatus, type PrismaClient } from "@prisma/client";
import { getContactPayload } from "@/lib/contact";
import {
  isArrivalTimeAllowed,
  isCourseServicePeriodConsistent,
  canAcceptWebReservation,
} from "@/lib/booking-rules";
import { jstDateFromString } from "@/lib/dates";
import type { ReservationServicePeriodKey } from "@/lib/reservation-config";
import {
  evaluateReservationAvailability,
  type AvailabilityReason,
  type AvailabilityResult,
} from "@/lib/reservation-capacity";

export type AvailabilityResponse = AvailabilityResult & {
  callPhone: string;
  callMessage: string;
};

export async function getAvailability(
  input: {
    date: string;
    servicePeriod: ReservationServicePeriodKey;
    partySize: number;
  },
  prisma: PrismaClient
): Promise<AvailabilityResponse> {
  const { callPhone, callMessage } = getContactPayload();

  const businessDay = await prisma.businessDay.findUnique({
    where: { date: input.date },
  });
  const reservations = await prisma.reservation.findMany({
    where: {
      date: input.date,
      servicePeriod: input.servicePeriod,
      status: ReservationStatus.CONFIRMED,
    },
    select: {
      partySize: true,
      status: true,
      servicePeriod: true,
    },
  });

  return {
    ...evaluateReservationAvailability({
      ...input,
      existingReservations: reservations,
      businessDayClosed: businessDay?.isClosed,
    }),
    callPhone,
    callMessage,
  };
}

export function isArrivalTimeValid(
  arrival?: string | null,
  servicePeriod?: ReservationServicePeriodKey | null
) {
  if (!arrival || !servicePeriod) return false;

  const [h, m] = arrival.split(":").map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h > 23 || m > 59 || h < 0 || m < 0) return false;

  return isArrivalTimeAllowed(arrival, undefined, servicePeriod);
}

export function isWithinAcceptance(dateStr: string) {
  const d = jstDateFromString(dateStr);
  return canAcceptWebReservation(d);
}

export function isCoursePeriodConsistent(
  course?: string | null,
  servicePeriod?: ReservationServicePeriodKey | null
) {
  return isCourseServicePeriodConsistent(course, servicePeriod);
}

export function availabilityReasonToError(reason: AvailabilityReason): {
  status: number;
  code: AvailabilityReason;
  error: string;
} {
  switch (reason) {
    case "INVALID_DATE":
      return { status: 400, code: reason, error: "日付形式が不正です" };
    case "BEFORE_OPENING":
      return {
        status: 400,
        code: reason,
        error: "2026-04-03より前のご予約は受け付けていません",
      };
    case "OUT_OF_RANGE":
      return { status: 400, code: reason, error: "予約可能期間外の日付です" };
    case "CLOSED":
      return { status: 400, code: reason, error: "休業日のため予約できません" };
    case "SAME_DAY_BLOCKED":
      return {
        status: 400,
        code: reason,
        error: "当日のオンライン予約は受け付けていません",
      };
    case "CUTOFF_PASSED":
      return {
        status: 400,
        code: reason,
        error: "Web予約は前日22:00で締め切りました。お電話でご相談ください。",
      };
    case "PHONE_ONLY":
      return {
        status: 409,
        code: reason,
        error: "この時間帯はWeb予約を停止しています。お電話でご相談ください。",
      };
    case "OK":
      return {
        status: 200,
        code: reason,
        error: "",
      };
  }
}
