import { ReservationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getContactPayload } from "@/lib/contact";
import { type AvailabilityResult, MAIN_CAPACITY } from "@/lib/availability";
import { isBeyondRange, isSameOrBeforeToday, jstDateFromString } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError } from "@/lib/logger";
import { monthStringSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function pad(num: number) {
  return String(num).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const route = "/api/availability/monthly";

  const month = request.nextUrl.searchParams.get("month");
  if (!month) {
    return apiError(400, {
      error: "month is required",
      code: "MISSING_MONTH",
      requestId,
    });
  }

  const parsedMonth = monthStringSchema.safeParse(month);
  if (!parsedMonth.success) {
    return apiError(400, {
      error: "month must be YYYY-MM format",
      code: "INVALID_MONTH",
      requestId,
    });
  }

  const [year, monthNum] = month.split("-").map((v) => Number(v));
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    return apiError(400, {
      error: "month must be valid YYYY-MM",
      code: "INVALID_MONTH",
      requestId,
    });
  }

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const dateKeys = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${year}-${pad(monthNum)}-${pad(day)}`;
  });

  const contact = getContactPayload();

  try {
    const [businessDays, reservations] = await Promise.all([
      prisma.businessDay.findMany({
        where: {
          date: { in: dateKeys },
          isClosed: true,
        },
        select: { date: true },
      }),
      prisma.reservation.findMany({
        where: {
          date: { in: dateKeys },
          status: ReservationStatus.CONFIRMED,
        },
        select: {
          date: true,
          partySize: true,
        },
      }),
    ]);

    const closedDates = new Set(businessDays.map((row) => row.date));
    const reservationBuckets = reservations.reduce<Record<string, { total: number; hasBanquet: boolean }>>(
      (acc, reservation) => {
        const current = acc[reservation.date] ?? { total: 0, hasBanquet: false };
        current.total += reservation.partySize;
        current.hasBanquet = current.hasBanquet || reservation.partySize >= 10;
        acc[reservation.date] = current;
        return acc;
      },
      {}
    );

    const result = dateKeys.reduce<Record<string, AvailabilityResult>>((acc, dateKey) => {
      const parsedDate = jstDateFromString(dateKey);

      if (isSameOrBeforeToday(parsedDate)) {
        acc[dateKey] = {
          ...contact,
          bookable: false,
          reason: "SAME_DAY_BLOCKED",
          mainRemaining: 0,
          room1Available: false,
          room2Available: false,
        };
        return acc;
      }

      if (isBeyondRange(parsedDate)) {
        acc[dateKey] = {
          ...contact,
          bookable: false,
          reason: "OUT_OF_RANGE",
          mainRemaining: 0,
          room1Available: false,
          room2Available: false,
        };
        return acc;
      }

      if (closedDates.has(dateKey)) {
        acc[dateKey] = {
          ...contact,
          bookable: false,
          reason: "CLOSED",
          mainRemaining: 0,
          room1Available: false,
          room2Available: false,
        };
        return acc;
      }

      const reserved = reservationBuckets[dateKey] ?? { total: 0, hasBanquet: false };
      const mainRemaining = Math.max(0, MAIN_CAPACITY - reserved.total);
      const bookable = !reserved.hasBanquet && mainRemaining > 0;

      acc[dateKey] = {
        ...contact,
        bookable,
        reason: bookable ? "OK" : "FULL",
        mainRemaining,
        room1Available: false,
        room2Available: false,
      };
      return acc;
    }, {});

    return NextResponse.json(
      {
        month,
        days: result,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    logError("availability.monthly.fetch.failed", {
      requestId,
      route,
      errorCode: "AVAILABILITY_MONTHLY_FETCH_FAILED",
      context: { month, message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Failed to fetch monthly availability",
      code: "AVAILABILITY_MONTHLY_FETCH_FAILED",
      requestId,
    });
  }
}
