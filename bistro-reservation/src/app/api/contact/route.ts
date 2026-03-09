import { NextRequest, NextResponse } from "next/server";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import { sendContactEmail } from "@/lib/email";
import { logError, logInfo, logWarn, getRequestId } from "@/lib/logger";
import { createContactSchema, zodFields } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SUBMIT_ERROR_MESSAGE = "送信に失敗しました。時間をおいて再度お試しください。";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const securityError = enforceWriteRequestSecurity(request);
  if (securityError) return securityError;

  const body = await request.json().catch(() => null);
  const parsed = createContactSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(400, {
      error: "入力内容が不正です",
      code: "VALIDATION_ERROR",
      fields: zodFields(parsed.error),
      requestId,
    });
  }

  const emailResult = await sendContactEmail(parsed.data);

  if (!emailResult.accepted) {
    logError("contact.send.failed", {
      requestId,
      route: "/api/contact",
      errorCode: emailResult.reason,
      context: {
        email: parsed.data.email,
        subject: parsed.data.subject,
      },
    });

    return apiError(500, {
      error: SUBMIT_ERROR_MESSAGE,
      code: "CONTACT_SEND_FAILED",
      requestId,
    });
  }

  if (!emailResult.sent) {
    logWarn("contact.delivery.skipped", {
      requestId,
      route: "/api/contact",
      errorCode: emailResult.reason,
      context: {
        email: parsed.data.email,
        subject: parsed.data.subject,
      },
    });
  }

  logInfo("contact.received", {
    requestId,
    route: "/api/contact",
    context: {
      email: parsed.data.email,
      subject: parsed.data.subject,
      delivered: emailResult.sent,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
  });
}
