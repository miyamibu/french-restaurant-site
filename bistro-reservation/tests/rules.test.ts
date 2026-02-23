import { describe, expect, it } from "vitest";
import { addMonths, format } from "date-fns";
import { SeatType, ReservationStatus } from "@prisma/client";
import {
  getAvailability,
  isArrivalTimeValid,
  isPrivateRoomValid,
  validateCapacity,
} from "@/lib/availability";
import { todayJst } from "@/lib/dates";

type MockReservation = { date: string; seatType: SeatType; partySize: number; status: ReservationStatus };

function createMockPrisma(reservations: MockReservation[] = [], businessDays: any[] = []) {
  return {
    reservation: {
      findMany: async ({ where }: any) =>
        reservations.filter((r) => r.date === where.date && r.status === where.status),
    },
    businessDay: {
      findUnique: async ({ where }: any) => businessDays.find((b) => b.date === where.date) || null,
    },
  } as any;
}

describe("予約ルール", () => {
  it("当日は予約不可", async () => {
    const today = format(todayJst(), "yyyy-MM-dd");
    const prisma = createMockPrisma();
    const result = await getAvailability(today, prisma);
    expect(result.bookable).toBe(false);
    expect(result.reason).toBe("SAME_DAY_BLOCKED");
  });

  it("3ヶ月超は予約不可", async () => {
    const future = format(addMonths(todayJst(), 4), "yyyy-MM-dd");
    const prisma = createMockPrisma();
    const result = await getAvailability(future, prisma);
    expect(result.bookable).toBe(false);
    expect(result.reason).toBe("OUT_OF_RANGE");
  });

  it("個室は2-4名のみ", () => {
    expect(isPrivateRoomValid(SeatType.ROOM1, 1)).toBe(false);
    expect(isPrivateRoomValid(SeatType.ROOM1, 2)).toBe(true);
    expect(isPrivateRoomValid(SeatType.ROOM1, 4)).toBe(true);
    expect(isPrivateRoomValid(SeatType.ROOM1, 5)).toBe(false);
  });

  it("メイン席12席を超えたら満席", async () => {
    const today = format(addMonths(todayJst(), 1), "yyyy-MM-dd");
    const reservations: MockReservation[] = [
      { date: today, seatType: SeatType.MAIN, partySize: 10, status: ReservationStatus.CONFIRMED },
      { date: today, seatType: SeatType.MAIN, partySize: 2, status: ReservationStatus.CONFIRMED },
      { date: today, seatType: SeatType.ROOM1, partySize: 2, status: ReservationStatus.CONFIRMED },
      { date: today, seatType: SeatType.ROOM2, partySize: 2, status: ReservationStatus.CONFIRMED },
    ];
    const prisma = createMockPrisma(reservations);
    const result = await getAvailability(today, prisma);
    expect(result.mainRemaining).toBe(0);
    expect(result.bookable).toBe(false);
    expect(result.reason).toBe("FULL");
  });

  it("個室の同日二重予約を拒否", () => {
    const existing = [
      { seatType: SeatType.ROOM1, partySize: 2 },
    ];
    const check = validateCapacity(SeatType.ROOM1, 3, existing as any);
    expect(check.ok).toBe(false);
  });

  it("来店時刻は17:30以降", () => {
    expect(isArrivalTimeValid("17:00")).toBe(false);
    expect(isArrivalTimeValid("17:30")).toBe(true);
    expect(isArrivalTimeValid("18:15")).toBe(true);
  });
});