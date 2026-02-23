import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { formatJst, todayJst } from "@/lib/dates";

export async function POST() {
  const tomorrow = addDays(todayJst(), 1);
  const target = formatJst(tomorrow);

  const reservations = await prisma.reservation.findMany({
    where: { date: target, status: ReservationStatus.CONFIRMED },
    orderBy: { createdAt: "asc" },
  });

  const hasLineEnv =
    !!process.env.LINE_CHANNEL_ACCESS_TOKEN && !!process.env.LINE_CHANNEL_SECRET && !!process.env.LIFF_ID;

  if (!hasLineEnv) {
    console.info("[remind] LINE未設定のためスキップ", { date: target, count: reservations.length });
    return NextResponse.json({
      status: "SKIPPED_LINE_SETUP",
      date: target,
      count: reservations.length,
    });
  }

  // 将来のLINE送信処理をここに実装
  console.info("[remind] LINE送信準備", { date: target, count: reservations.length });

  return NextResponse.json({ status: "OK", date: target, count: reservations.length });
}
