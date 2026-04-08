import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus, ReservationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  availabilityReasonToError,
  isArrivalTimeValid,
  isCoursePeriodConsistent,
} from "@/lib/availability";
import { inferReservationServicePeriodFromArrivalTime } from "@/lib/booking-rules";
import { sendReservationEmail } from "@/lib/email";
import { createPrivateBlockAuditLog } from "@/lib/private-block-audit";
import {
  hasPrivateBlockAccessCode,
  PRIVATE_BLOCK_ACCESS_DENIED_CODE,
  PRIVATE_BLOCK_ACCESS_MISSING_CODE,
  verifyPrivateBlockAccessCode,
} from "@/lib/private-block-access";
import {
  buildPrivateBlockReservationInput,
  evaluatePrivateBlockSubmission,
  PRIVATE_BLOCK_ERROR_MESSAGE,
} from "@/lib/private-block";
import {
  enforceReservationWriteRateLimit,
  isReservationRateLimitError,
} from "@/lib/reservation-rate-limit";
import { buildReservationAdvisoryLockKey } from "@/lib/reservation-lock";
import { evaluateReservationAvailability } from "@/lib/reservation-capacity";
import { getClientIp, getUserAgent, hashClientIp } from "@/lib/request-meta";
import {
  RESERVATION_SCHEMA_NOT_READY_CODE,
  ensureReservationSchemaReady,
  createReservationCompat,
  findReservationsCompat,
  isReservationSchemaNotReadyError,
} from "@/lib/reservation-compat";
import {
  createPrivateBlockSchema,
  createReservationSchema,
  type CreatePrivateBlockInput,
  zodFields,
} from "@/lib/validation";
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

  try {
    await ensureReservationSchemaReady(prisma);
  } catch (error) {
    if (isReservationSchemaNotReadyError(error)) {
      return apiError(503, {
          error: "予約システムの準備が完了していません",
        code: RESERVATION_SCHEMA_NOT_READY_CODE,
        requestId,
        ...contact,
      });
    }

    logError("reservation.schema_check.failed", {
      requestId,
      route: "/api/reservations",
      errorCode: "RESERVATION_SCHEMA_CHECK_FAILED",
      context: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return apiError(500, {
      error: "予約処理の初期化に失敗しました",
      code: "RESERVATION_SCHEMA_CHECK_FAILED",
      requestId,
      ...contact,
    });
  }

  const body = await request.json().catch(() => null);
  const ipAddress = getClientIp(request);
  const userAgent = getUserAgent(request);
  const ipHash = hashClientIp(ipAddress);
  // TEMPORARY:
  // Private-block handling still lives on this public endpoint during the staff-surface migration.
  // If a correct access code is provided, direct POST can still create PRIVATE_BLOCK records.
  // Move this branch to `/api/staff/private-block` or `/api/admin/private-block` in a follow-up.
  const privateBlockRequested = body?.reservationType === ReservationType.PRIVATE_BLOCK;
  let privateBlockPayload: CreatePrivateBlockInput | null = null;
  let privateBlockServicePeriod: "LUNCH" | "DINNER" | null = null;

  if (privateBlockRequested) {
    const parsedPrivateBlock = createPrivateBlockSchema.safeParse(body);
    if (!parsedPrivateBlock.success) {
      return apiError(400, {
        error: "入力内容が不正です",
        code: "VALIDATION_ERROR",
        fields: zodFields(parsedPrivateBlock.error),
        requestId,
        ...contact,
      });
    }

    if (!hasPrivateBlockAccessCode()) {
      return apiError(503, {
        error: "貸切設定は現在利用できません",
        code: PRIVATE_BLOCK_ACCESS_MISSING_CODE,
        requestId,
        ...contact,
      });
    }

    if (!verifyPrivateBlockAccessCode(parsedPrivateBlock.data.privateBlockAccessCode)) {
      return apiError(401, {
        error: "管理用パスコードが正しくありません",
        code: PRIVATE_BLOCK_ACCESS_DENIED_CODE,
        requestId,
        ...contact,
      });
    }

    privateBlockServicePeriod = inferReservationServicePeriodFromArrivalTime(
      parsedPrivateBlock.data.arrivalTime
    );
    if (!privateBlockServicePeriod) {
      return apiError(400, {
        error: "貸切設定の来店時間が不正です",
        code: "INVALID_ARRIVAL_TIME",
        requestId,
        ...contact,
      });
    }

    privateBlockPayload = parsedPrivateBlock.data;
  }

  const privateBlockRateScope =
    privateBlockPayload && privateBlockServicePeriod
      ? {
          date: privateBlockPayload.date,
          servicePeriod: privateBlockServicePeriod,
        }
      : undefined;

  try {
    await enforceReservationWriteRateLimit(prisma, {
      ipHash,
      privateBlockSlot: privateBlockRateScope,
    });
  } catch (error) {
    if (isReservationRateLimitError(error)) {
      return apiError(429, {
        error: error.message,
        code: error.code,
        requestId,
        ...contact,
      });
    }

    logError("reservation.rate_limit.failed", {
      requestId,
      route: "/api/reservations",
      errorCode: "RATE_LIMIT_CHECK_FAILED",
      context: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return apiError(500, {
      error: "予約処理の初期化に失敗しました",
      code: "RATE_LIMIT_CHECK_FAILED",
      requestId,
      ...contact,
    });
  }

  if (privateBlockRequested && privateBlockPayload && privateBlockServicePeriod) {
    const { date, phone, note } = privateBlockPayload;
    const servicePeriod = privateBlockServicePeriod;

    for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
      try {
        const privateBlock = await prisma.$transaction(
          async (tx) => {
            await acquireReservationAdvisoryLock(tx, date, servicePeriod);

            const confirmed = await findReservationsCompat(tx, {
              where: {
                date,
                servicePeriod,
                status: ReservationStatus.CONFIRMED,
              },
            });

            const privateBlockAction = evaluatePrivateBlockSubmission(
              confirmed.map((reservation) => ({
                reservationType: reservation.reservationType,
                status: reservation.status,
              }))
            );

            if (privateBlockAction === "NO_OP") {
              const existingPrivateBlock = confirmed.find(
                (reservation) => reservation.reservationType === ReservationType.PRIVATE_BLOCK
              );
              if (!existingPrivateBlock) {
                throw new Error("PRIVATE_BLOCK");
              }

              await createPrivateBlockAuditLog(tx, {
                reservationId: existingPrivateBlock.id,
                date,
                servicePeriod,
                result: "NO_OP",
                source: "PUBLIC_FORM",
                requestId,
                ipAddress,
                userAgent,
                note,
              });

              return {
                reservation: existingPrivateBlock,
                result: "NO_OP" as const,
              };
            }

            if (privateBlockAction === "CONFLICT") {
              throw new Error("PRIVATE_BLOCK");
            }

            const reservation = await createReservationCompat(
              tx,
              buildPrivateBlockReservationInput({
                date,
                servicePeriod,
                phone,
                note,
              })
            );

            await createPrivateBlockAuditLog(tx, {
              reservationId: reservation.id,
              date,
              servicePeriod,
              result: "CREATED",
              source: "PUBLIC_FORM",
              requestId,
              ipAddress,
              userAgent,
              note,
            });

            return {
              reservation,
              result: "CREATED" as const,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        logInfo("reservation.private_block.saved", {
          requestId,
          route: "/api/reservations",
          context: {
            reservationId: privateBlock.reservation.id,
            date,
            servicePeriod,
            result: privateBlock.result,
          },
        });

        return NextResponse.json(
          {
            result: privateBlock.result,
            reservationId: privateBlock.reservation.id,
            summary:
              privateBlock.result === "NO_OP"
                ? "この時間帯は既に貸切営業です。"
                : "貸切営業を設定しました。",
            requestId,
          },
          {
            status: privateBlock.result === "CREATED" ? 201 : 200,
          }
        );
      } catch (error: unknown) {
        if (isReservationSchemaNotReadyError(error)) {
          return apiError(503, {
              error: "予約システムの準備が完了していません",
            code: RESERVATION_SCHEMA_NOT_READY_CODE,
            requestId,
            ...contact,
          });
        }

        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
            ? error
            : String(error);
        const isRetryable =
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === "P2034" || error.code === "P2002")) ||
          message.includes("could not serialize");

        if (isRetryable && attempt < RETRIES) {
          continue;
        }

        if (message === "PRIVATE_BLOCK") {
          logError("reservation.private_block.rejected", {
            requestId,
            route: "/api/reservations",
            errorCode: "PRIVATE_BLOCK",
            context: { date, servicePeriod, attempt },
          });
          return apiError(409, {
            result: "CONFLICT",
            error: PRIVATE_BLOCK_ERROR_MESSAGE,
            code: "PRIVATE_BLOCK",
            requestId,
            ...contact,
          });
        }

        const status = isRetryable ? 409 : 500;
        const code = isRetryable ? "RESERVATION_CONFLICT" : "UNKNOWN_ERROR";
        const errorMessage = isRetryable
          ? "予約処理が競合しました。時間をおいて再度お試しください。"
          : "予約処理に失敗しました";

        logError("reservation.private_block.failed", {
          requestId,
          route: "/api/reservations",
          errorCode: code,
          context: { attempt, message, date, servicePeriod },
        });

        return apiError(status, {
          error: errorMessage,
          code,
          requestId,
          ...contact,
        });
      }
    }

    logError("reservation.private_block.retry.exceeded", {
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
              reservationType: reservation.reservationType,
            })),
            businessDayClosed: businessDay?.isClosed,
          });

          if (availability.reason !== "OK") {
            throw new Error(availability.reason);
          }

          return createReservationCompat(tx, {
            date,
            servicePeriod,
            reservationType: ReservationType.NORMAL,
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
      if (isReservationSchemaNotReadyError(error)) {
        return apiError(503, {
            error: "予約システムの準備が完了していません",
          code: RESERVATION_SCHEMA_NOT_READY_CODE,
          requestId,
          ...contact,
        });
      }

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
        "PRIVATE_BLOCK",
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
