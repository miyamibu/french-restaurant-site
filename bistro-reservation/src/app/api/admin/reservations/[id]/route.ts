import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReservationStatus } from "@prisma/client";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const reservation = await prisma.reservation.findUnique({ where: { id: params.id } });
  if (!reservation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(reservation);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const status = body?.status as ReservationStatus | undefined;
  if (!status || !(Object.values(ReservationStatus) as string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: { status },
  });
  return NextResponse.json(updated);
}