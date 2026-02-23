import { NextRequest, NextResponse } from "next/server";
import { Prisma, ReservationStatus, SeatType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isArrivalTimeValid, MAIN_CAPACITY } from "@/lib/availability";
import { jstDateFromString, isSameOrBeforeToday, isBeyondRange } from "@/lib/dates";
import { sendReservationEmail } from "@/lib/email";

const callPhone = "09098297614";
const callMessage = `お電話でお問い合わせください：${callPhone}`;
const RETRIES = 3;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, seatType, partySize, arrivalTime, name, phone, note, lineUserId } = body ?? {};

  if (!date || !partySize || !name || !phone) {
    return NextResponse.json({ reason: "INVALID_INPUT", callPhone, callMessage }, { status: 400 });
  }
  const partyCount = Number(partySize);
  if (Number.isNaN(partyCount) || partyCount < 1) {
    return NextResponse.json({ reason: "INVALID_INPUT", callPhone, callMessage }, { status: 400 });
  }

  let parsedDate: Date;
  try {
    parsedDate = jstDateFromString(date);
  } catch (e) {
    return NextResponse.json({ reason: "INVALID_DATE", callPhone, callMessage }, { status: 400 });
  }

  if (isSameOrBeforeToday(parsedDate)) {
    return NextResponse.json({ reason: "SAME_DAY_BLOCKED", callPhone, callMessage }, { status: 400 });
  }

  if (isBeyondRange(parsedDate)) {
    return NextResponse.json({ reason: "OUT_OF_RANGE", callPhone, callMessage }, { status: 400 });
  }

  if (!isArrivalTimeValid(arrivalTime)) {
    return NextResponse.json({ reason: "INVALID_ARRIVAL_TIME", callPhone, callMessage }, { status: 400 });
  }

  const typedSeat = SeatType.MAIN;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const reservation = await prisma.$transaction(
        async (tx) => {
          const businessDay = await tx.businessDay.findUnique({ where: { date } });
          if (businessDay?.isClosed) {
            throw new Error("CLOSED");
          }

          const confirmed = await tx.reservation.findMany({
            where: { date, status: ReservationStatus.CONFIRMED },
          });

          const total = confirmed.reduce((sum, r) => sum + r.partySize, 0);
          const hasBanquet = confirmed.some((r) => r.partySize >= 10);

          if (hasBanquet) {
            throw new Error("BANQUET_LOCKED");
          }

          if (partyCount >= 10) {
            if (confirmed.length > 0) {
              throw new Error("BANQUET_NEEDS_EMPTY");
            }
            if (partyCount > MAIN_CAPACITY) {
              throw new Error("MAIN_FULL");
            }
          } else {
            if (total + partyCount > MAIN_CAPACITY) {
              throw new Error("MAIN_FULL");
            }
          }

          const created = await tx.reservation.create({
            data: {
              date,
              seatType: typedSeat,
              partySize: partyCount,
              arrivalTime: arrivalTime ?? null,
              name,
              phone,
              note: note ?? null,
              status: ReservationStatus.CONFIRMED,
              lineUserId: lineUserId ?? null,
            },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      const adminLink = `${process.env.BASE_URL ?? ""}/admin/reservations/${reservation.id}`;
      sendReservationEmail({ reservation, adminUrl: adminLink }).catch((err) => {
        console.error("Email send failed", err);
      });

      return NextResponse.json({
        reservationId: reservation.id,
        summary: `${reservation.date} ${reservation.seatType} ${reservation.partySize}名で承りました。`,
        adminLink,
      });
    } catch (error: any) {
      const isRetryable =
        error?.code === "P2034" ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
        String(error?.message || "").includes("could not serialize");

      if (isRetryable && attempt < RETRIES) {
        continue;
      }

      const message = String(error?.message || "");
      let reason = "UNKNOWN";
      if (message.includes("CLOSED")) reason = "CLOSED";
      else if (message.includes("MAIN_FULL")) reason = "MAIN_FULL";
      else if (message.includes("BANQUET_LOCKED") || message.includes("BANQUET_NEEDS_EMPTY"))
        reason = "MAIN_FULL";

      return NextResponse.json({ reason, callPhone, callMessage }, { status: 409 });
    }
  }

  return NextResponse.json({ reason: "RETRY_EXCEEDED", callPhone, callMessage }, { status: 500 });
}
