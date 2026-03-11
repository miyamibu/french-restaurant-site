import { ReservationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getContactPayload } from "@/lib/contact";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError } from "@/lib/logger";
import { evaluateReservationAvailability } from "@/lib/reservation-capacity";
import {
  monthStringSchema,
  reservationServicePeriodSchema,
} from "@/lib/validation";
import type { AvailabilityResponse } from "@/lib/availability";

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

  const servicePeriod = request.nextUrl.searchParams.get("servicePeriod");
  if (!servicePeriod) {
    return apiError(400, {
      error: "servicePeriod is required",
      code: "MISSING_SERVICE_PERIOD",
      requestId,
    });
  }

  const parsedServicePeriod = reservationServicePeriodSchema.safeParse(servicePeriod);
  if (!parsedServicePeriod.success) {
    return apiError(400, {
      error: "servicePeriod must be LUNCH or DINNER",
      code: "INVALID_SERVICE_PERIOD",
      requestId,
    });
  }

  const partySizeParam = request.nextUrl.searchParams.get("partySize");
  if (!partySizeParam) {
    return apiError(400, {
      error: "partySize is required",
      code: "MISSING_PARTY_SIZE",
      requestId,
    });
  }

  const partySize = Number(partySizeParam);
  if (!Number.isInteger(partySize) || partySize < 1) {
    return apiError(400, {
      error: "partySize must be a positive integer",
      code: "INVALID_PARTY_SIZE",
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
          servicePeriod: parsedServicePeriod.data,
          status: ReservationStatus.CONFIRMED,
        },
        select: {
          date: true,
          partySize: true,
          status: true,
          servicePeriod: true,
        },
      }),
    ]);

    const closedDates = new Set(businessDays.map((row) => row.date));
    const reservationsByDate = reservations.reduce<
      Record<
        string,
        Array<{
          partySize: number;
          status: ReservationStatus;
          servicePeriod: typeof parsedServicePeriod.data;
        }>
      >
    >((acc, reservation) => {
      const current = acc[reservation.date] ?? [];
      current.push(reservation);
      acc[reservation.date] = current;
      return acc;
    }, {});

    const result = dateKeys.reduce<Record<string, AvailabilityResponse>>((acc, dateKey) => {
      acc[dateKey] = {
        ...evaluateReservationAvailability({
          date: dateKey,
          servicePeriod: parsedServicePeriod.data,
          partySize,
          existingReservations: reservationsByDate[dateKey] ?? [],
          businessDayClosed: closedDates.has(dateKey),
        }),
        ...contact,
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
      context: {
        month,
        servicePeriod,
        partySize,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return apiError(500, {
      error: "Failed to fetch monthly availability",
      code: "AVAILABILITY_MONTHLY_FETCH_FAILED",
      requestId,
    });
  }
}
