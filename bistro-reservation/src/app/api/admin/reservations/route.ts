import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { isAuthorized } from "@/lib/basic-auth";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const route = "/api/admin/reservations";

  if (!isAuthorized(request)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  try {
    const params = request.nextUrl.searchParams;
    const date = params.get("date");
    const statusParam = params.get("status");
    const status =
      statusParam && Object.values(ReservationStatus).includes(statusParam as ReservationStatus)
        ? (statusParam as ReservationStatus)
        : undefined;
    if (statusParam && !status) {
      return apiError(400, {
        error: "status is invalid",
        code: "INVALID_STATUS",
        requestId,
      });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        date: date ?? undefined,
        status,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(reservations);
  } catch (error) {
    logError("admin.reservations.fetch.failed", {
      requestId,
      route,
      errorCode: "ADMIN_RESERVATIONS_FETCH_FAILED",
      context: { message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Failed to fetch reservations",
      code: "ADMIN_RESERVATIONS_FETCH_FAILED",
      requestId,
    });
  }
}
