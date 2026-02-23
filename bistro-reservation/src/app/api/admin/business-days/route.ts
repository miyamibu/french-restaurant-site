import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (date) {
    const day = await prisma.businessDay.findUnique({ where: { date } });
    return NextResponse.json(day ?? { date, isClosed: false });
  }
  const days = await prisma.businessDay.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(days);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, isClosed, note } = body ?? {};
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  const saved = await prisma.businessDay.upsert({
    where: { date },
    update: { isClosed: !!isClosed, note: note ?? null },
    create: { date, isClosed: !!isClosed, note: note ?? null },
  });
  return NextResponse.json(saved);
}