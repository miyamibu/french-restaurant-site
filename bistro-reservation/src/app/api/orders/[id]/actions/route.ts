import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/basic-auth";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import {
  cancelOrderPayloadSchema,
  confirmHumanPayloadSchema,
  markCollectedPayloadSchema,
  markPaidPayloadSchema,
  markShippedPayloadSchema,
  orderActionRequestSchema,
  setPaymentMethodPayloadSchema,
  zodFields,
} from "@/lib/validation";
import {
  buildIdempotencyHash,
  executeCancelOrderAction,
  executeConfirmHumanAction,
  executeMarkCollectedAction,
  executeMarkPaidAction,
  executeMarkShippedAction,
  executeSetPaymentMethodAction,
  runIdempotentMutation,
} from "@/lib/order-actions";
import { getRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function getIdempotencyKey(request: NextRequest) {
  return request.headers.get("idempotency-key")?.trim() ?? "";
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const requestId = getRequestId(request);
  const { id } = await params;

  const securityError = enforceWriteRequestSecurity(request, { requestId });
  if (securityError) return securityError;

  const idempotencyKey = getIdempotencyKey(request);
  if (!idempotencyKey) {
    return apiError(400, {
      ok: false,
      error: "Idempotency-Key が必要です",
      code: "MISSING_IDEMPOTENCY_KEY",
      requestId,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = orderActionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, {
      ok: false,
      error: "入力内容が不正です",
      code: "VALIDATION_ERROR",
      fields: zodFields(parsed.error),
      requestId,
    });
  }

  const { action, expectedVersion, payload } = parsed.data;

  try {
    switch (action) {
      case "CONFIRM_HUMAN": {
        const payloadResult = confirmHumanPayloadSchema.safeParse(payload);
        if (!payloadResult.success) {
          return apiError(400, {
            ok: false,
            error: "入力内容が不正です",
            code: "VALIDATION_ERROR",
            fields: zodFields(payloadResult.error),
            requestId,
          });
        }

        const actorKey = `user:${id}`;
        const result = await runIdempotentMutation({
          scope: "POST:/api/orders/{id}/actions:CONFIRM_HUMAN",
          actorKey,
          idempotencyKey,
          requestHash: buildIdempotencyHash({
            action,
            orderId: id,
            expectedVersion,
            payload: payloadResult.data,
          }),
          execute: () =>
            executeConfirmHumanAction({
              orderId: id,
              expectedVersion,
              humanToken: payloadResult.data.humanToken,
              actorId: actorKey,
              requestId,
              idempotencyKey,
            }),
        });

        return NextResponse.json(result.body, { status: result.status });
      }

      case "SET_PAYMENT_METHOD": {
        const payloadResult = setPaymentMethodPayloadSchema.safeParse(payload);
        if (!payloadResult.success) {
          return apiError(400, {
            ok: false,
            error: "入力内容が不正です",
            code: "VALIDATION_ERROR",
            fields: zodFields(payloadResult.error),
            requestId,
          });
        }

        const actorKey = `user:${id}`;
        const result = await runIdempotentMutation({
          scope: "POST:/api/orders/{id}/actions:SET_PAYMENT_METHOD",
          actorKey,
          idempotencyKey,
          requestHash: buildIdempotencyHash({
            action,
            orderId: id,
            expectedVersion,
            payload: payloadResult.data,
          }),
          execute: () =>
            executeSetPaymentMethodAction({
              orderId: id,
              expectedVersion,
              paymentMethod: payloadResult.data.paymentMethod,
              storeVisitDate: payloadResult.data.storeVisitDate ?? null,
              actorType: "user",
              actorId: actorKey,
              requestId,
              idempotencyKey,
            }),
        });

        return NextResponse.json(result.body, { status: result.status });
      }

      case "MARK_PAID":
      case "MARK_COLLECTED":
      case "MARK_SHIPPED":
      case "CANCEL": {
        if (!isAuthorized(request)) {
          return apiError(401, {
            ok: false,
            error: "Unauthorized",
            code: "UNAUTHORIZED",
            requestId,
          });
        }

        const actorKey = "admin";

        if (action === "MARK_PAID") {
          const payloadResult = markPaidPayloadSchema.safeParse(payload);
          if (!payloadResult.success) {
            return apiError(400, {
              ok: false,
              error: "入力内容が不正です",
              code: "VALIDATION_ERROR",
              fields: zodFields(payloadResult.error),
              requestId,
            });
          }

          const result = await runIdempotentMutation({
            scope: "POST:/api/orders/{id}/actions:MARK_PAID",
            actorKey,
            idempotencyKey,
            requestHash: buildIdempotencyHash({
              action,
              orderId: id,
              expectedVersion,
              payload: payloadResult.data,
            }),
            execute: () =>
              executeMarkPaidAction({
                orderId: id,
                expectedVersion,
                paymentReference: payloadResult.data.paymentReference,
                receivedAmount: payloadResult.data.receivedAmount,
                actorType: "admin",
                actorId: actorKey,
                requestId,
                idempotencyKey,
                adminNote: payloadResult.data.adminNote,
              }),
          });

          return NextResponse.json(result.body, { status: result.status });
        }

        if (action === "MARK_COLLECTED") {
          const payloadResult = markCollectedPayloadSchema.safeParse(payload);
          if (!payloadResult.success) {
            return apiError(400, {
              ok: false,
              error: "入力内容が不正です",
              code: "VALIDATION_ERROR",
              fields: zodFields(payloadResult.error),
              requestId,
            });
          }

          const result = await runIdempotentMutation({
            scope: "POST:/api/orders/{id}/actions:MARK_COLLECTED",
            actorKey,
            idempotencyKey,
            requestHash: buildIdempotencyHash({
              action,
              orderId: id,
              expectedVersion,
              payload: payloadResult.data,
            }),
            execute: () =>
              executeMarkCollectedAction({
                orderId: id,
                expectedVersion,
                receivedAmount: payloadResult.data.receivedAmount,
                actorType: "admin",
                actorId: actorKey,
                requestId,
                idempotencyKey,
                adminNote: payloadResult.data.adminNote,
              }),
          });

          return NextResponse.json(result.body, { status: result.status });
        }

        if (action === "MARK_SHIPPED") {
          const payloadResult = markShippedPayloadSchema.safeParse(payload);
          if (!payloadResult.success) {
            return apiError(400, {
              ok: false,
              error: "入力内容が不正です",
              code: "VALIDATION_ERROR",
              fields: zodFields(payloadResult.error),
              requestId,
            });
          }

          const result = await runIdempotentMutation({
            scope: "POST:/api/orders/{id}/actions:MARK_SHIPPED",
            actorKey,
            idempotencyKey,
            requestHash: buildIdempotencyHash({
              action,
              orderId: id,
              expectedVersion,
              payload: payloadResult.data,
            }),
            execute: () =>
              executeMarkShippedAction({
                orderId: id,
                expectedVersion,
                actorType: "admin",
                actorId: actorKey,
                requestId,
                idempotencyKey,
                adminNote: payloadResult.data.adminNote,
              }),
          });

          return NextResponse.json(result.body, { status: result.status });
        }

        const payloadResult = cancelOrderPayloadSchema.safeParse(payload);
        if (!payloadResult.success) {
          return apiError(400, {
            ok: false,
            error: "入力内容が不正です",
            code: "VALIDATION_ERROR",
            fields: zodFields(payloadResult.error),
            requestId,
          });
        }

        const result = await runIdempotentMutation({
          scope: "POST:/api/orders/{id}/actions:CANCEL",
          actorKey,
          idempotencyKey,
          requestHash: buildIdempotencyHash({
            action,
            orderId: id,
            expectedVersion,
            payload: payloadResult.data,
          }),
          execute: () =>
            executeCancelOrderAction({
              orderId: id,
              expectedVersion,
              reasonCode: payloadResult.data.reasonCode,
              actorType: "admin",
              actorId: actorKey,
              requestId,
              idempotencyKey,
              adminNote: payloadResult.data.adminNote,
            }),
        });

        return NextResponse.json(result.body, { status: result.status });
      }

      default:
        return apiError(400, {
          ok: false,
          error: "未対応のアクションです",
          code: "INVALID_ACTION",
          requestId,
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return apiError(500, {
      ok: false,
      error: message,
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    });
  }
}
