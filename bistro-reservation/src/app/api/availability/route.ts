import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/lib/availability";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError } from "@/lib/logger";
import { dateStringSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return apiError(400, {
      error: "date is required",
      code: "MISSING_DATE",
      requestId,
    });
  }

  const parsedDate = dateStringSchema.safeParse(date);
  if (!parsedDate.success) {
    return apiError(400, {
      error: "date must be YYYY-MM-DD format",
      code: "INVALID_DATE",
      requestId,
    });
  }

  try {
    const availability = await getAvailability(date, prisma);
    return NextResponse.json(availability, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    logError("availability.fetch.failed", {
      requestId,
      route: "/api/availability",
      errorCode: "AVAILABILITY_FETCH_FAILED",
      context: { date, message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Failed to fetch availability",
      code: "AVAILABILITY_FETCH_FAILED",
      requestId,
    });
  }
}
