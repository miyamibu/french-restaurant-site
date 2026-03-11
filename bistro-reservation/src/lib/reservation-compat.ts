import { randomUUID } from "crypto";
import {
  Prisma,
  ReservationStatus,
  type PrismaClient,
  type Reservation,
  type SeatType,
} from "@prisma/client";
import { inferReservationServicePeriodFromArrivalTime } from "@/lib/booking-rules";
import type { ReservationServicePeriodKey } from "@/lib/reservation-config";

type ReservationClient = PrismaClient | Prisma.TransactionClient;

type LegacyReservationRow = Omit<Reservation, "servicePeriod">;

type ReservationCreateCompatInput = {
  date: string;
  servicePeriod: ReservationServicePeriodKey;
  seatType: SeatType;
  partySize: number;
  arrivalTime: string | null;
  name: string;
  phone: string;
  note: string | null;
  status: ReservationStatus;
  lineUserId: string | null;
};

function deriveServicePeriod(
  arrivalTime: string | null,
  fallback: ReservationServicePeriodKey = "DINNER"
): ReservationServicePeriodKey {
  return inferReservationServicePeriodFromArrivalTime(arrivalTime) ?? fallback;
}

function mapLegacyReservation(row: LegacyReservationRow): Reservation {
  return {
    ...row,
    servicePeriod: deriveServicePeriod(row.arrivalTime),
  };
}

function buildWhereClauses(where: Prisma.ReservationWhereInput | undefined) {
  const clauses: Prisma.Sql[] = [];

  if (!where) {
    return clauses;
  }

  if (typeof where.id === "string") {
    clauses.push(Prisma.sql`"id" = ${where.id}`);
  }

  if (typeof where.date === "string") {
    clauses.push(Prisma.sql`"date" = ${where.date}`);
  } else if (where.date && typeof where.date === "object" && !Array.isArray(where.date)) {
    if ("gte" in where.date && where.date.gte) {
      clauses.push(Prisma.sql`"date" >= ${where.date.gte}`);
    }
    if ("lte" in where.date && where.date.lte) {
      clauses.push(Prisma.sql`"date" <= ${where.date.lte}`);
    }
    if ("in" in where.date && Array.isArray(where.date.in) && where.date.in.length > 0) {
      clauses.push(Prisma.sql`"date" IN (${Prisma.join(where.date.in)})`);
    }
  }

  if (typeof where.status === "string") {
    clauses.push(Prisma.sql`"status" = ${where.status}`);
  } else if (where.status && typeof where.status === "object" && !Array.isArray(where.status)) {
    if ("not" in where.status && typeof where.status.not === "string") {
      clauses.push(Prisma.sql`"status" <> ${where.status.not}`);
    }
  }

  return clauses;
}

function applyLegacyPostFilter(
  rows: Reservation[],
  where: Prisma.ReservationWhereInput | undefined
) {
  if (!where) {
    return rows;
  }

  let filtered = rows;

  if (typeof where.servicePeriod === "string") {
    filtered = filtered.filter(
      (reservation) => reservation.servicePeriod === where.servicePeriod
    );
  }

  return filtered;
}

function sortReservations(
  rows: Reservation[],
  orderBy: Prisma.ReservationOrderByWithRelationInput | Prisma.ReservationOrderByWithRelationInput[] | undefined
) {
  const orderList = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  if (orderList.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const item of orderList) {
      const [field, direction] = Object.entries(item)[0] ?? [];
      if (!field || !direction || typeof direction !== "string") {
        continue;
      }

      const leftValue = left[field as keyof Reservation];
      const rightValue = right[field as keyof Reservation];

      if (leftValue === rightValue) {
        continue;
      }

      const comparison = leftValue instanceof Date && rightValue instanceof Date
        ? leftValue.getTime() - rightValue.getTime()
        : String(leftValue).localeCompare(String(rightValue));

      return direction === "desc" ? -comparison : comparison;
    }

    return 0;
  });
}

export function isMissingServicePeriodColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const hasServicePeriodHint = /serviceperiod/i.test(message);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2022"
      ? true
      : hasServicePeriodHint &&
          /(does not exist|not found|unknown|invalid|missing)/i.test(message);
  }

  return hasServicePeriodHint && /(does not exist|not found|unknown|invalid|missing)/i.test(message);
}

async function findManyLegacyReservations(
  client: ReservationClient,
  args: Prisma.ReservationFindManyArgs
) {
  const clauses = buildWhereClauses(args.where);
  const whereSql =
    clauses.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
      : Prisma.empty;

  const rows = await client.$queryRaw<LegacyReservationRow[]>(Prisma.sql`
    SELECT
      "id",
      "date",
      "seatType",
      "partySize",
      "arrivalTime",
      "name",
      "phone",
      "note",
      "status",
      "lineUserId",
      "createdAt",
      "updatedAt"
    FROM "Reservation"
    ${whereSql}
  `);

  const mapped = applyLegacyPostFilter(rows.map(mapLegacyReservation), args.where);
  return sortReservations(mapped, args.orderBy);
}

export async function findReservationsCompat(
  client: ReservationClient,
  args: Prisma.ReservationFindManyArgs
) {
  try {
    return await client.reservation.findMany(args);
  } catch (error) {
    if (!isMissingServicePeriodColumnError(error)) {
      throw error;
    }

    return findManyLegacyReservations(client, args);
  }
}

export async function findReservationByIdCompat(client: ReservationClient, id: string) {
  try {
    return await client.reservation.findUnique({ where: { id } });
  } catch (error) {
    if (!isMissingServicePeriodColumnError(error)) {
      throw error;
    }

    const rows = await client.$queryRaw<LegacyReservationRow[]>(Prisma.sql`
      SELECT
        "id",
        "date",
        "seatType",
        "partySize",
        "arrivalTime",
        "name",
        "phone",
        "note",
        "status",
        "lineUserId",
        "createdAt",
        "updatedAt"
      FROM "Reservation"
      WHERE "id" = ${id}
      LIMIT 1
    `);

    const row = rows[0];
    return row ? mapLegacyReservation(row) : null;
  }
}

export async function createReservationCompat(
  client: ReservationClient,
  data: ReservationCreateCompatInput
) {
  try {
    return await client.reservation.create({ data });
  } catch (error) {
    if (!isMissingServicePeriodColumnError(error)) {
      throw error;
    }

    const now = new Date();
    const id = randomUUID();
    const rows = await client.$queryRaw<LegacyReservationRow[]>(Prisma.sql`
      INSERT INTO "Reservation" (
        "id",
        "date",
        "seatType",
        "partySize",
        "arrivalTime",
        "name",
        "phone",
        "note",
        "status",
        "lineUserId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${data.date},
        ${data.seatType},
        ${data.partySize},
        ${data.arrivalTime},
        ${data.name},
        ${data.phone},
        ${data.note},
        ${data.status},
        ${data.lineUserId},
        ${now},
        ${now}
      )
      RETURNING
        "id",
        "date",
        "seatType",
        "partySize",
        "arrivalTime",
        "name",
        "phone",
        "note",
        "status",
        "lineUserId",
        "createdAt",
        "updatedAt"
    `);

    const row = rows[0];
    if (!row) {
      throw new Error("LEGACY_RESERVATION_INSERT_FAILED");
    }

    return {
      ...row,
      servicePeriod: data.servicePeriod,
    } satisfies Reservation;
  }
}

export async function updateReservationStatusCompat(
  client: ReservationClient,
  id: string,
  status: ReservationStatus
) {
  try {
    return await client.reservation.update({
      where: { id },
      data: { status },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return null;
    }

    if (!isMissingServicePeriodColumnError(error)) {
      throw error;
    }

    const rows = await client.$queryRaw<LegacyReservationRow[]>(Prisma.sql`
      UPDATE "Reservation"
      SET
        "status" = ${status},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${id}
      RETURNING
        "id",
        "date",
        "seatType",
        "partySize",
        "arrivalTime",
        "name",
        "phone",
        "note",
        "status",
        "lineUserId",
        "createdAt",
        "updatedAt"
    `);

    const row = rows[0];
    return row ? mapLegacyReservation(row) : null;
  }
}
