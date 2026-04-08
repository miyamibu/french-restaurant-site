import { ReservationStatus, ReservationType, type BusinessDay } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ensureReservationSchemaReady,
  findReservationsCompat,
} from "@/lib/reservation-compat";

type ReservationRow = Awaited<ReturnType<typeof findReservationsCompat>>[number];

const ACTIVE_STATUS_FILTER = {
  not: ReservationStatus.CANCELLED,
} as const;

export type AdminDayPeriodStatus = {
  privateBlock: {
    active: boolean;
    id: string | null;
  };
  reservations: {
    count: number;
    partyTotal: number;
    names: string[];
  };
};

export type AdminDayStatus = {
  date: string;
  isClosed: boolean;
  note: string | null;
  lunch: AdminDayPeriodStatus;
  dinner: AdminDayPeriodStatus;
};

export type AdminMonthDaySummary = {
  date: string;
  isClosed: boolean;
  hasLunchPrivateBlock: boolean;
  hasDinnerPrivateBlock: boolean;
  normalReservationCount: number;
  hasConflict: boolean;
};

export type AdminMonthStatus = {
  month: string;
  days: Record<string, AdminMonthDaySummary>;
};

function parseMonthInput(month: string): { year: number; monthIndex: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error("INVALID_MONTH");
  }

  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (!year || monthNum < 1 || monthNum > 12) {
    throw new Error("INVALID_MONTH");
  }

  return { year, monthIndex: monthNum - 1 };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getDateKeysForMonth(month: string) {
  const { year, monthIndex } = parseMonthInput(month);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
  });
}

function buildPeriodStatus(
  reservations: ReservationRow[],
  servicePeriod: "LUNCH" | "DINNER"
): AdminDayPeriodStatus {
  const inPeriod = reservations.filter((row) => row.servicePeriod === servicePeriod);
  const privateBlock = inPeriod.find((row) => row.reservationType === ReservationType.PRIVATE_BLOCK);
  const normalReservations = inPeriod.filter(
    (row) => row.reservationType !== ReservationType.PRIVATE_BLOCK
  );

  return {
    privateBlock: {
      active: Boolean(privateBlock),
      id: privateBlock?.id ?? null,
    },
    reservations: {
      count: normalReservations.length,
      partyTotal: normalReservations.reduce((sum, row) => sum + row.partySize, 0),
      names: normalReservations.map((row) => row.name),
    },
  };
}

function buildDayStatus(date: string, businessDay: BusinessDay | null, reservations: ReservationRow[]) {
  const lunch = buildPeriodStatus(reservations, "LUNCH");
  const dinner = buildPeriodStatus(reservations, "DINNER");
  return {
    date,
    isClosed: businessDay?.isClosed ?? false,
    note: businessDay?.note ?? null,
    lunch,
    dinner,
  } satisfies AdminDayStatus;
}

export async function getAdminDayStatus(date: string): Promise<AdminDayStatus> {
  await ensureReservationSchemaReady(prisma);

  const [businessDay, reservations] = await Promise.all([
    prisma.businessDay.findUnique({ where: { date } }),
    findReservationsCompat(prisma, {
      where: {
        date,
        status: ACTIVE_STATUS_FILTER,
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  return buildDayStatus(date, businessDay, reservations);
}

export async function getAdminMonthStatus(month: string): Promise<AdminMonthStatus> {
  await ensureReservationSchemaReady(prisma);

  const dateKeys = getDateKeysForMonth(month);
  const [businessDays, reservations] = await Promise.all([
    prisma.businessDay.findMany({
      where: {
        date: { in: dateKeys },
      },
    }),
    findReservationsCompat(prisma, {
      where: {
        date: { in: dateKeys },
        status: ACTIVE_STATUS_FILTER,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const businessDayByDate = new Map<string, BusinessDay>(
    businessDays.map((businessDay) => [businessDay.date, businessDay])
  );
  const reservationsByDate = reservations.reduce<Record<string, ReservationRow[]>>((acc, row) => {
    const current = acc[row.date] ?? [];
    current.push(row);
    acc[row.date] = current;
    return acc;
  }, {});

  const days = dateKeys.reduce<Record<string, AdminMonthDaySummary>>((acc, date) => {
    const dayStatus = buildDayStatus(
      date,
      businessDayByDate.get(date) ?? null,
      reservationsByDate[date] ?? []
    );
    const hasLunchPrivateBlock = dayStatus.lunch.privateBlock.active;
    const hasDinnerPrivateBlock = dayStatus.dinner.privateBlock.active;
    const normalReservationCount =
      dayStatus.lunch.reservations.count + dayStatus.dinner.reservations.count;

    acc[date] = {
      date,
      isClosed: dayStatus.isClosed,
      hasLunchPrivateBlock,
      hasDinnerPrivateBlock,
      normalReservationCount,
      hasConflict: dayStatus.isClosed && (hasLunchPrivateBlock || hasDinnerPrivateBlock),
    };
    return acc;
  }, {});

  return { month, days };
}
