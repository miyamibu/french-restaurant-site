import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/basic-auth";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import { updateReservationStatusSchema, zodFields } from "@/lib/validation";
import { getRequestId, logError } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/admin/reservations/[id]";
  const { id } = await params;

  if (!isAuthorized(request)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      return apiError(404, { error: "Not found", code: "RESERVATION_NOT_FOUND", requestId });
    }
    return NextResponse.json(reservation);
  } catch (error) {
    logError("admin.reservation.fetch.failed", {
      requestId,
      route,
      errorCode: "ADMIN_RESERVATION_FETCH_FAILED",
      context: { id, message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Failed to fetch reservation",
      code: "ADMIN_RESERVATION_FETCH_FAILED",
      requestId,
    });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const requestId = getRequestId(request);
  const route = "/api/admin/reservations/[id]";
  const { id } = await params;

  if (!isAuthorized(request)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  const securityError = enforceWriteRequestSecurity(request, { requestId });
  if (securityError) return securityError;

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateReservationStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, {
        error: "入力内容が不正です",
        code: "VALIDATION_ERROR",
        fields: zodFields(parsed.error),
        requestId,
      });
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return apiError(404, {
        error: "Not found",
        code: "RESERVATION_NOT_FOUND",
        requestId,
      });
    }

    logError("admin.reservation.update.failed", {
      requestId,
      route,
      errorCode: "ADMIN_RESERVATION_UPDATE_FAILED",
      context: { id, message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Failed to update reservation",
      code: "ADMIN_RESERVATION_UPDATE_FAILED",
      requestId,
    });
  }
}
