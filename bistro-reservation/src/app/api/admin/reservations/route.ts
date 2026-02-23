import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const date = params.get("date");
  const status = params.get("status");

  const reservations = await prisma.reservation.findMany({
    where: {
      date: date ?? undefined,
      status: status ? (status as ReservationStatus) : undefined,
    },
    orderBy: [
      { date: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json(reservations);
}
