import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isArrivalTimeValid, MAIN_CAPACITY } from "@/lib/availability";
import { jstDateFromString, isSameOrBeforeToday, isBeyondRange } from "@/lib/dates";
import { sendReservationEmail } from "@/lib/email";
import { createReservationSchema, zodFields } from "@/lib/validation";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import { getContactPayload } from "@/lib/contact";
import { env } from "@/lib/env";
import { getRequestId, logError, logInfo } from "@/lib/logger";

const RETRIES = 3;

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

  const { date, partySize, arrivalTime, name, phone, note, lineUserId, course } = parsed.data;
  const reservationNote = [course ? `コース: ${course}` : null, note]
    .filter(Boolean)
    .join("\n") || null;
  const partyCount = Number(partySize);

  let parsedDate: Date;
  try {
    parsedDate = jstDateFromString(date);
  } catch {
    return apiError(400, {
      error: "日付形式が不正です",
      code: "INVALID_DATE",
      requestId,
      ...contact,
    });
  }

  if (isSameOrBeforeToday(parsedDate)) {
    return apiError(400, {
      error: "当日のオンライン予約は受け付けていません",
      code: "SAME_DAY_BLOCKED",
      requestId,
      ...contact,
    });
  }

  if (isBeyondRange(parsedDate)) {
    return apiError(400, {
      error: "予約可能期間外の日付です",
      code: "OUT_OF_RANGE",
      requestId,
      ...contact,
    });
  }

  if (!isArrivalTimeValid(arrivalTime)) {
    return apiError(400, {
      error: "来店時間が不正です",
      code: "INVALID_ARRIVAL_TIME",
      requestId,
      ...contact,
    });
  }

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          const businessDay = await tx.businessDay.findUnique({ where: { date } });
          if (businessDay?.isClosed) {
            throw new Error("CLOSED");
          }

          const confirmed = await tx.reservation.findMany({
            where: { date, status: ReservationStatus.CONFIRMED },
          });

          const total = confirmed.reduce((sum, r) => sum + r.partySize, 0);
          const hasBanquet = confirmed.some((r) => r.partySize >= 10);

          if (hasBanquet) {
            throw new Error("BANQUET_LOCKED");
          }

          if (partyCount >= 10) {
            if (confirmed.length > 0) {
              throw new Error("BANQUET_NEEDS_EMPTY");
            }
            if (partyCount > MAIN_CAPACITY) {
              throw new Error("MAIN_FULL");
            }
          } else {
            if (total + partyCount > MAIN_CAPACITY) {
              throw new Error("MAIN_FULL");
            }
          }

          const created = await tx.reservation.create({
            data: {
              date,
              seatType: "MAIN",
              partySize: partyCount,
              arrivalTime: arrivalTime ?? null,
              name,
              phone,
              note: reservationNote,
              status: ReservationStatus.CONFIRMED,
              lineUserId: lineUserId ?? null,
            },
          });

          return created;
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
          partySize: reservation.partySize,
        },
      });

      return NextResponse.json({
        reservationId: reservation.id,
        summary: `${reservation.date} ${reservation.partySize}名で承りました。`,
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

      let code = "RESERVATION_CONFLICT";
      let errorMessage = "予約枠が埋まっています";
      let status = 409;

      if (message.includes("CLOSED")) {
        code = "CLOSED";
        errorMessage = "休業日のため予約できません";
      } else if (message.includes("MAIN_FULL")) {
        code = "MAIN_FULL";
        errorMessage = "満席のため予約できません";
      } else if (message.includes("BANQUET_LOCKED") || message.includes("BANQUET_NEEDS_EMPTY")) {
        code = "BANQUET_CONFLICT";
        errorMessage = "貸切予約の都合で予約できません";
      } else if (!isRetryable) {
        code = "UNKNOWN_ERROR";
        errorMessage = "予約処理に失敗しました";
        status = 500;
      }

      logError("reservation.create.failed", {
        requestId,
        route: "/api/reservations",
        errorCode: code,
        context: { attempt, message },
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
