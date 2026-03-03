import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError, logInfo } from "@/lib/logger";

export const runtime = "nodejs";
const ORDER_HISTORY_RETENTION_DAYS = 365;

function isAuthorizedCron(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return !!env.CRON_SECRET && authHeader === `Bearer ${env.CRON_SECRET}`;
}

function isGetCompatibilityRequest(req: NextRequest) {
  return req.headers.get("x-vercel-cron") === "1" || req.nextUrl.searchParams.get("compat") === "1";
}

async function executeDeleteOldHistories(req: NextRequest) {
  const requestId = getRequestId(req);
  const route = "/api/crons/delete-old-histories";

  if (!isAuthorizedCron(req)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  try {
    const retentionThreshold = new Date();
    retentionThreshold.setDate(retentionThreshold.getDate() - ORDER_HISTORY_RETENTION_DAYS);
    const retentionThresholdString = retentionThreshold.toISOString();

    const { data: oldHistories, error: selectError } = await supabaseServer
      .from("order_history")
      .select("id")
      .lt("deleted_at", retentionThresholdString);

    if (selectError) {
      logError("crons.delete_old_histories.select_failed", {
        requestId,
        route,
        errorCode: "CRON_SELECT_FAILED",
        context: { message: selectError.message },
      });
      return apiError(500, {
        error: "Database error",
        code: "CRON_SELECT_FAILED",
        requestId,
      });
    }

    if (!oldHistories || oldHistories.length === 0) {
      return NextResponse.json({
        message: "No old order histories to delete",
        deletedCount: 0,
        retentionDays: ORDER_HISTORY_RETENTION_DAYS,
        requestId,
      });
    }

    const oldIds = oldHistories.map((history) => history.id);
    const { error: deleteError } = await supabaseServer.from("order_history").delete().in("id", oldIds);

    if (deleteError) {
      logError("crons.delete_old_histories.delete_failed", {
        requestId,
        route,
        errorCode: "CRON_DELETE_FAILED",
        context: { message: deleteError.message },
      });
      return apiError(500, {
        error: "Delete error",
        code: "CRON_DELETE_FAILED",
        requestId,
      });
    }

    logInfo("crons.delete_old_histories.success", {
      requestId,
      route,
      context: { deletedCount: oldHistories.length },
    });
    return NextResponse.json({
      message: "Successfully deleted old order histories",
      deletedCount: oldHistories.length,
      retentionDays: ORDER_HISTORY_RETENTION_DAYS,
      requestId,
    });
  } catch (error) {
    logError("crons.delete_old_histories.unexpected", {
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
  return executeDeleteOldHistories(req);
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

  return executeDeleteOldHistories(req);
}

