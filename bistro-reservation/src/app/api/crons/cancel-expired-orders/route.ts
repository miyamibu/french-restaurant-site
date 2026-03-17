import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-security";
import { executeCancelOrderAction, OrderActionError } from "@/lib/order-actions";
import { getRequestId, logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorizedCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
}

function isGetCompatibilityRequest(req: NextRequest) {
  return req.headers.get("x-vercel-cron") === "1" || req.nextUrl.searchParams.get("compat") === "1";
}

async function executeCancelExpired(req: NextRequest) {
  const requestId = getRequestId(req);
  const route = "/api/crons/cancel-expired-orders";

  if (!isAuthorizedCron(req)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  try {
    const nowIso = new Date().toISOString();

    const [quotedResponse, pendingResponse] = await Promise.all([
      supabaseServer
        .from("orders")
        .select("id, version, status, hold_expires_at, expires_at, canceled_at")
        .is("canceled_at", null)
        .eq("status", "QUOTED")
        .lt("hold_expires_at", nowIso),
      supabaseServer
        .from("orders")
        .select("id, version, status, hold_expires_at, expires_at, canceled_at")
        .is("canceled_at", null)
        .eq("status", "PENDING_PAYMENT")
        .lt("expires_at", nowIso),
    ]);

    const quotedError = quotedResponse.error;
    const pendingError = pendingResponse.error;
    const selectError = quotedError ?? pendingError;
    const ordersToCancel = [...(quotedResponse.data ?? []), ...(pendingResponse.data ?? [])];

    if (selectError) {
      logError("crons.cancel_expired.select_failed", {
        requestId,
        route,
        errorCode: "CRON_SELECT_FAILED",
        context: {
          message: selectError.message,
          quotedError: quotedError?.message ?? null,
          pendingError: pendingError?.message ?? null,
        },
      });
      return apiError(500, {
        error: "Database error",
        code: "CRON_SELECT_FAILED",
        requestId,
      });
    }

    if (!ordersToCancel || ordersToCancel.length === 0) {
      return NextResponse.json({
        message: "No orders to cancel",
        cancelledCount: 0,
        requestId,
      });
    }

    let cancelledCount = 0;
    let skippedCount = 0;
    for (const order of ordersToCancel) {
      const isExpiredHold =
        order.status === "QUOTED" &&
        !!order.hold_expires_at &&
        new Date(String(order.hold_expires_at)).getTime() < Date.now();

      const reasonCode = isExpiredHold ? "EXPIRED_HOLD" : "EXPIRED_PAYMENT";

      try {
        await executeCancelOrderAction({
          orderId: String(order.id),
          expectedVersion: Number(order.version ?? 0),
          reasonCode,
          actorType: "cron",
          actorId: "cron",
          requestId,
          idempotencyKey: `cron:${requestId}:${order.id}:${reasonCode}`,
          adminNote: "cancel-expired-orders cron",
        });
        cancelledCount += 1;
      } catch (error) {
        if (
          error instanceof OrderActionError &&
          (error.code === "VERSION_CONFLICT" ||
            error.code === "ALREADY_CANCELLED" ||
            error.code === "ALREADY_COMPLETED")
        ) {
          skippedCount += 1;
          continue;
        }

        throw error;
      }
    }

    logInfo("crons.cancel_expired.success", {
      requestId,
      route,
      context: { cancelledCount, skippedCount },
    });
    return NextResponse.json({
      message: "Successfully cancelled expired quoted/pending-payment orders",
      cancelledCount,
      skippedCount,
      requestId,
    });
  } catch (error) {
    logError("crons.cancel_expired.unexpected", {
      requestId,
      route,
      errorCode: "INTERNAL_SERVER_ERROR",
      context: { message: error instanceof Error ? error.message : String(error) },
    });
    return apiError(500, {
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    });
  }
}

export async function POST(req: NextRequest) {
  return executeCancelExpired(req);
}

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  if (!isGetCompatibilityRequest(req)) {
    return apiError(
      405,
      {
        error: "Method not allowed. Use POST.",
        code: "METHOD_NOT_ALLOWED",
        requestId,
      },
      { headers: { Allow: "POST" } }
    );
  }

  return executeCancelExpired(req);
}
