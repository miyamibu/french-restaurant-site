import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase-server";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { formatJst, isBusinessDay, jstDateFromString, todayJst } from "@/lib/dates";
import { apiError, enforceWriteRequestSecurity } from "@/lib/api-security";
import { createOrderSchema, zodFields } from "@/lib/validation";
import {
  buildIdempotencyHash,
  createDefaultHumanConfirmationWindow,
  createQuotedHoldExpiry,
  executeSetPaymentMethodAction,
  normalizeOrderPaymentMethod,
  runIdempotentMutation,
} from "@/lib/order-actions";
import { getRequestId, logError, logInfo, logWarn } from "@/lib/logger";

export const dynamic = "force-dynamic";

const STORE_VISIT_MIN_DAYS = 14;
const STORE_VISIT_MAX_DAYS = 30;

function getIdempotencyKey(request: NextRequest) {
  return request.headers.get("idempotency-key")?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const route = "/api/orders";

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

  try {
    const body = await request.json().catch(() => null);
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, {
        ok: false,
        error: "入力内容が不正です",
        code: "VALIDATION_ERROR",
        fields: zodFields(parsed.error),
        requestId,
      });
    }

    const input = parsed.data;
    const normalizedPaymentMethod = normalizeOrderPaymentMethod(input.paymentMethod);

    if (normalizedPaymentMethod === "PAY_IN_STORE" && input.storeVisitDate) {
      let storeVisitDate: Date;
      try {
        storeVisitDate = jstDateFromString(input.storeVisitDate);
      } catch {
        return apiError(400, {
          ok: false,
          error: "来店日の形式が不正です",
          code: "INVALID_STORE_VISIT_DATE",
          requestId,
        });
      }

      if (!isBusinessDay(storeVisitDate)) {
        return apiError(400, {
          ok: false,
          error: "来店日は営業日（木〜日）を選択してください",
          code: "STORE_VISIT_NOT_BUSINESS_DAY",
          requestId,
        });
      }

      const today = todayJst();
      const minDate = addDays(today, STORE_VISIT_MIN_DAYS);
      const maxDate = addDays(today, STORE_VISIT_MAX_DAYS);
      if (storeVisitDate < minDate || storeVisitDate > maxDate) {
        return apiError(400, {
          ok: false,
          error: "来店日は注文日から14日後〜30日後の範囲で選択してください",
          code: "STORE_VISIT_OUT_OF_RANGE",
          requestId,
          fields: {
            storeVisitDate: `${formatJst(minDate)} - ${formatJst(maxDate)}`,
          },
        });
      }
    }

    const actorKey = `order-create:${input.customerInfo.email.toLowerCase()}:${input.customerInfo.phone}`;
    const requestHash = buildIdempotencyHash({
      items: input.items,
      customerInfo: input.customerInfo,
      paymentMethod: normalizedPaymentMethod,
      total: input.total,
      storeVisitDate: input.storeVisitDate ?? null,
    });

    const result = await runIdempotentMutation({
      scope: "POST:/api/orders",
      actorKey,
      idempotencyKey,
      requestHash,
      successStatus: 201,
      execute: async () => {
        const menuItems = await prisma.menuItem.findMany({
          where: {
            id: { in: input.items.map((item) => item.id) },
            isPublished: true,
          },
        });

        if (menuItems.length !== input.items.length) {
          throw new Error("INVALID_MENU_ITEM");
        }

        const calculatedTotal = input.items.reduce((sum, clientItem) => {
          const menuItem = menuItems.find((m) => m.id === clientItem.id);
          if (!menuItem) {
            throw new Error(`Menu item not found: ${clientItem.id}`);
          }
          return sum + menuItem.price * clientItem.quantity;
        }, 0);

        if (calculatedTotal !== input.total) {
          logWarn("orders.total.mismatch", {
            requestId,
            route,
            errorCode: "ORDER_TOTAL_MISMATCH",
            context: {
              clientTotal: input.total,
              calculatedTotal,
              items: input.items,
            },
          });
          throw new Error("ORDER_TOTAL_MISMATCH");
        }

        const validatedItems = input.items.map((clientItem) => {
          const menuItem = menuItems.find((m) => m.id === clientItem.id)!;
          return {
            id: menuItem.id,
            name: menuItem.title,
            price: menuItem.price,
            quantity: clientItem.quantity,
          };
        });

        const { confirmedAt, confirmedExpiresAt } = createDefaultHumanConfirmationWindow();
        const holdExpiresAt = createQuotedHoldExpiry();

        const { data: insertedOrder, error: insertError } = await supabaseServer
          .from("orders")
          .insert([
            {
              customer_name: input.customerInfo.name,
              email: input.customerInfo.email,
              phone: input.customerInfo.phone,
              zip_code: input.customerInfo.zipCode,
              prefecture: input.customerInfo.prefecture,
              city: input.customerInfo.city,
              address: input.customerInfo.address,
              building: input.customerInfo.building || null,
              payment_method: null,
              payment_reference: null,
              items: validatedItems,
              total: calculatedTotal,
              store_visit_date: normalizedPaymentMethod === "PAY_IN_STORE" ? input.storeVisitDate : null,
              hold_expires_at: holdExpiresAt,
              expires_at: null,
              human_confirmed_at: confirmedAt,
              human_confirmed_expires_at: confirmedExpiresAt,
              human_confirmed_by: "direct-web-checkout",
              paid_at: null,
              shipped_at: null,
              canceled_at: null,
              cancel_reason: null,
              version: 0,
              status: "QUOTED",
            },
          ])
          .select()
          .single();

        if (insertError || !insertedOrder) {
          logError("orders.create.db.failed", {
            requestId,
            route,
            errorCode: "ORDER_DB_INSERT_FAILED",
            context: { message: insertError?.message ?? "No order returned" },
          });
          throw new Error("ORDER_DB_INSERT_FAILED");
        }

        let finalOrder = insertedOrder as Record<string, unknown>;
        if (normalizedPaymentMethod) {
          let actionResponse;
          try {
            actionResponse = await executeSetPaymentMethodAction({
              orderId: String(insertedOrder.id),
              expectedVersion: 0,
              paymentMethod: normalizedPaymentMethod,
              storeVisitDate: input.storeVisitDate ?? null,
              actorType: "user",
              actorId: actorKey,
              requestId,
              idempotencyKey: `${idempotencyKey}:SET_PAYMENT_METHOD`,
            });
          } catch (error) {
            await supabaseServer
              .from("orders")
              .delete()
              .eq("id", insertedOrder.id)
              .eq("status", "QUOTED")
              .eq("version", 0);

            throw error;
          }

          finalOrder =
            (actionResponse.order as Record<string, unknown> | undefined) ??
            finalOrder;
        }

        if (normalizedPaymentMethod) {
          sendOrderConfirmationEmail(
            input.customerInfo,
            validatedItems,
            calculatedTotal,
            normalizedPaymentMethod,
            input.storeVisitDate
          ).catch((emailError) => {
            logError("orders.email.failed", {
              requestId,
              route,
              errorCode: "ORDER_EMAIL_SEND_FAILED",
              context: {
                orderId: String(insertedOrder.id),
                message: emailError instanceof Error ? emailError.message : String(emailError),
              },
            });
          });
        }

        logInfo("orders.create.success", {
          requestId,
          route,
          context: {
            orderId: insertedOrder.id,
            paymentMethod: normalizedPaymentMethod,
            total: calculatedTotal,
          },
        });

        return {
          ok: true,
          message: "Order created successfully",
          order: finalOrder,
          requestId,
        };
      },
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_MENU_ITEM") {
      return apiError(400, {
        ok: false,
        error: "無効な商品が含まれています",
        code: "INVALID_MENU_ITEM",
        requestId,
      });
    }

    if (message === "ORDER_TOTAL_MISMATCH") {
      return apiError(400, {
        ok: false,
        error: "注文合計金額が正確ではありません",
        code: "ORDER_TOTAL_MISMATCH",
        requestId,
      });
    }

    if (message === "ORDER_DB_INSERT_FAILED") {
      return apiError(500, {
        ok: false,
        error: "注文の保存に失敗しました",
        code: "ORDER_DB_INSERT_FAILED",
        requestId,
      });
    }

    logError("orders.create.unexpected", {
      requestId,
      route,
      errorCode: "INTERNAL_SERVER_ERROR",
      context: { message },
    });
    return apiError(500, {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
      requestId,
    });
  }
}
