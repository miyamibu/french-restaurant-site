import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/lib/availability";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const availability = await getAvailability(date, prisma);
  return NextResponse.json(availability, {
    headers: { "Cache-Control": "no-store" },
  });
}