import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  availabilityReasonToError,
  isArrivalTimeValid,
  isCoursePeriodConsistent,
} from "@/lib/availability";
import { sendReservationEmail } from "@/lib/email";
import { buildReservationAdvisoryLockKey } from "@/lib/reservation-lock";
import { evaluateReservationAvailability } from "@/lib/reservation-capacity";
import {
  createReservationCompat,
  findReservationsCompat,
} from "@/lib/reservation-compat";
import { createReservationSchema, zodFields } from "@/lib/validation";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import { getContactPayload } from "@/lib/contact";
import { env } from "@/lib/env";
import { getRequestId, logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

const RETRIES = 3;

async function acquireReservationAdvisoryLock(
  tx: Prisma.TransactionClient,
  date: string,
  servicePeriod: string
) {
  const lockKey = buildReservationAdvisoryLockKey(date, servicePeriod);
  await tx.$executeRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    lockKey
  );
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const contact = getContactPayload();

  const securityError = enforceWriteRequestSecurity(request, {
    requestId,
    requireRequestedWith: false,
  });
  if (securityError) return securityError;

  const body = await request.json().catch(() => null);
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, {
      error: "入力内容が不正です",
      code: "VALIDATION_ERROR",
      fields: zodFields(parsed.error),
      requestId,
      ...contact,
    });
  }

  const {
    date,
    servicePeriod,
    partySize,
    arrivalTime,
    name,
    phone,
    note,
    lineUserId,
    course,
  } = parsed.data;
  const reservationNote =
    [course ? `コース: ${course}` : null, note].filter(Boolean).join("\n") || null;

  if (!isArrivalTimeValid(arrivalTime, servicePeriod)) {
    return apiError(400, {
      error: "選択した時間帯の予約可能な来店時間を選択してください",
      code: "INVALID_ARRIVAL_TIME",
      requestId,
      ...contact,
    });
  }

  if (!isCoursePeriodConsistent(course, servicePeriod)) {
    return apiError(400, {
      error: "コースの時間帯とご来店時間帯が一致していません",
      code: "COURSE_TIME_MISMATCH",
      requestId,
      ...contact,
    });
  }

  const initialBusinessDay = await prisma.businessDay.findUnique({ where: { date } });
  const initialAvailability = evaluateReservationAvailability({
    date,
    servicePeriod,
    partySize,
    existingReservations: [],
    businessDayClosed: initialBusinessDay?.isClosed,
  });

  if (initialAvailability.reason !== "OK" && initialAvailability.reason !== "PHONE_ONLY") {
    const mapped = availabilityReasonToError(initialAvailability.reason);
    return apiError(mapped.status, {
      error: mapped.error,
      code: mapped.code,
      requestId,
      ...contact,
    });
  }

  if (initialAvailability.reason === "PHONE_ONLY") {
    const mapped = availabilityReasonToError("PHONE_ONLY");
    return apiError(mapped.status, {
      error: mapped.error,
      code: mapped.code,
      requestId,
      ...contact,
    });
  }

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          await acquireReservationAdvisoryLock(tx, date, servicePeriod);

          const businessDay = await tx.businessDay.findUnique({ where: { date } });
          const confirmed = await findReservationsCompat(tx, {
            where: {
              date,
              servicePeriod,
              status: ReservationStatus.CONFIRMED,
            },
          });

          const availability = evaluateReservationAvailability({
            date,
            servicePeriod,
            partySize,
            existingReservations: confirmed.map((reservation) => ({
              partySize: reservation.partySize,
              status: reservation.status,
              servicePeriod: reservation.servicePeriod,
            })),
            businessDayClosed: businessDay?.isClosed,
          });

          if (availability.reason !== "OK") {
            throw new Error(availability.reason);
          }

          return createReservationCompat(tx, {
            date,
            servicePeriod,
            seatType: "MAIN",
            partySize,
            arrivalTime,
            name,
            phone,
            note: reservationNote,
            status: ReservationStatus.CONFIRMED,
            lineUserId: lineUserId ?? null,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      const adminLink = env.BASE_URL ? `${env.BASE_URL}/admin/reservations/${reservation.id}` : "";
      sendReservationEmail({ reservation, adminUrl: adminLink }).catch((err) => {
        logError("reservation.email.failed", {
          requestId,
          route: "/api/reservations",
          errorCode: "EMAIL_SEND_FAILED",
          context: {
            reservationId: reservation.id,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      });

      logInfo("reservation.created", {
        requestId,
        route: "/api/reservations",
        context: {
          reservationId: reservation.id,
          date: reservation.date,
          servicePeriod: reservation.servicePeriod,
          partySize: reservation.partySize,
        },
      });

      return NextResponse.json({
        reservationId: reservation.id,
        summary: `${reservation.date} ${reservation.servicePeriod === "LUNCH" ? "ランチ" : "ディナー"} ${reservation.partySize}名で承りました。`,
        adminLink: adminLink || undefined,
        requestId,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
      const isRetryable =
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
        message.includes("could not serialize");

      if (isRetryable && attempt < RETRIES) {
        continue;
      }

      const availabilityReasons = new Set([
        "INVALID_DATE",
        "BEFORE_OPENING",
        "OUT_OF_RANGE",
        "CLOSED",
        "SAME_DAY_BLOCKED",
        "CUTOFF_PASSED",
        "PHONE_ONLY",
      ]);

      if (availabilityReasons.has(message)) {
        const mapped = availabilityReasonToError(
          message as Parameters<typeof availabilityReasonToError>[0]
        );
        logError("reservation.create.failed", {
          requestId,
          route: "/api/reservations",
          errorCode: mapped.code,
          context: { attempt, message, date, servicePeriod, partySize },
        });
        return apiError(mapped.status, {
          error: mapped.error,
          code: mapped.code,
          requestId,
          ...contact,
        });
      }

      const status = isRetryable ? 409 : 500;
      const code = isRetryable ? "RESERVATION_CONFLICT" : "UNKNOWN_ERROR";
      const errorMessage = isRetryable
        ? "予約処理が競合しました。時間をおいて再度お試しください。"
        : "予約処理に失敗しました";

      logError("reservation.create.failed", {
        requestId,
        route: "/api/reservations",
        errorCode: code,
        context: { attempt, message, date, servicePeriod, partySize },
      });

      return apiError(status, {
        error: errorMessage,
        code,
        requestId,
        ...contact,
      });
    }
  }

  logError("reservation.retry.exceeded", {
    requestId,
    route: "/api/reservations",
    errorCode: "RETRY_EXCEEDED",
  });

  return apiError(500, {
    error: "予約処理が混み合っています。時間をおいてお試しください",
    code: "RETRY_EXCEEDED",
    requestId,
    ...contact,
  });
}
