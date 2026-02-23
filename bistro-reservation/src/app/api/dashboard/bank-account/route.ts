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
      .from("bank_account")
      .select("*")
      .limit(1);

    if (error) throw error;

    return NextResponse.json(data?.[0] || {});
  } catch (error) {
    console.error("Failed to fetch bank account:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank account" },
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
    const {
      id,
      bank_name,
      branch_name,
      account_type,
      account_number,
      account_holder,
    } = body;

    if (
      !bank_name ||
      !branch_name ||
      !account_type ||
      !account_number ||
      !account_holder
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let bankAccount;
    if (id) {
      // Update
      const { data, error } = await supabaseServer
        .from("bank_account")
        .update({
          bank_name,
          branch_name,
          account_type,
          account_number,
          account_holder,
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      bankAccount = data?.[0];
    } else {
      // Create
      const { data, error } = await supabaseServer
        .from("bank_account")
        .insert([
          {
            bank_name,
            branch_name,
            account_type,
            account_number,
            account_holder,
          },
        ])
        .select();

      if (error) throw error;
      bankAccount = data?.[0];
    }

    return NextResponse.json(bankAccount || {});
  } catch (error) {
    console.error("Failed to save bank account:", error);
    return NextResponse.json(
      { error: "Failed to save bank account" },
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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("bank_account")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bank account:", error);
    return NextResponse.json(
      { error: "Failed to delete bank account" },
      { status: 500 }
    );
  }
}
