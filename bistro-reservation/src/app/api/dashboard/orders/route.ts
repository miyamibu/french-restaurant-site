import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/basic-auth";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  // 認証チェック
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // 認証チェック
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Missing orderId or status" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select();

    if (error) throw error;

    return NextResponse.json(data?.[0] || {});
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // 認証チェック
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    // 注文を履歴に移動
    const { data: orderData, error: fetchError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 履歴テーブルに追加
    const { error: insertError } = await supabaseServer
      .from("order_history")
      .insert([{ ...orderData, status: "shipped" }]);

    if (insertError) throw insertError;

    // 元の注文を削除
    const { error: deleteError } = await supabaseServer
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to ship order:", error);
    return NextResponse.json(
      { error: "Failed to ship order" },
      { status: 500 }
    );
  }
}
