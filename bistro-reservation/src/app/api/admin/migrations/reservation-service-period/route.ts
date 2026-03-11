import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthorized } from "@/lib/basic-auth";
import { apiError } from "@/lib/api-security";
import { getRequestId, logError, logInfo } from "@/lib/logger";

export const dynamic = "force-dynamic";

type ExistsRow = { exists: boolean };
type InvalidReservationRow = {
  id: string;
  date: string;
  arrivalTime: string | null;
  status: string;
};

async function hasServicePeriodColumn() {
  const rows = await prisma.$queryRaw<ExistsRow[]>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Reservation'
        AND column_name = 'servicePeriod'
    ) AS exists
  `);

  return rows[0]?.exists ?? false;
}

async function hasServicePeriodIndex() {
  const rows = await prisma.$queryRaw<ExistsRow[]>(Prisma.sql`
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'Reservation_date_servicePeriod_idx'
    ) AS exists
  `);

  return rows[0]?.exists ?? false;
}

async function findInvalidBackfillRows() {
  return prisma.$queryRaw<InvalidReservationRow[]>(Prisma.sql`
    SELECT
      "id",
      "date",
      "arrivalTime",
      "status"::text AS "status"
    FROM "Reservation"
    WHERE "servicePeriod" IS NULL
    ORDER BY "createdAt" ASC
  `);
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const route = "/api/admin/migrations/reservation-service-period";

  if (!isAuthorized(request)) {
    return apiError(401, { error: "Unauthorized", code: "UNAUTHORIZED", requestId });
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        CREATE TYPE "ServicePeriod" AS ENUM ('LUNCH', 'DINNER');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    if (!(await hasServicePeriodColumn())) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Reservation"
        ADD COLUMN "servicePeriod" "ServicePeriod"
      `);
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "Reservation"
      SET "servicePeriod" = CASE
        WHEN "arrivalTime" >= '11:00' AND "arrivalTime" <= '13:30' THEN 'LUNCH'::"ServicePeriod"
        WHEN "arrivalTime" >= '17:30' AND "arrivalTime" <= '20:00' THEN 'DINNER'::"ServicePeriod"
        ELSE NULL
      END
      WHERE "servicePeriod" IS NULL
    `);

    const invalidRows = await findInvalidBackfillRows();
    if (invalidRows.length > 0) {
      logError("admin.migration.reservation_service_period.invalid_rows", {
        requestId,
        route,
        errorCode: "RESERVATION_SERVICE_PERIOD_BACKFILL_FAILED",
        context: {
          count: invalidRows.length,
          ids: invalidRows.map((row) => row.id),
        },
      });

      return apiError(409, {
        error: "servicePeriod backfill failed",
        code: "RESERVATION_SERVICE_PERIOD_BACKFILL_FAILED",
        requestId,
        count: invalidRows.length,
        rows: invalidRows,
      });
    }

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Reservation"
      ALTER COLUMN "servicePeriod" SET NOT NULL
    `);

    if (!(await hasServicePeriodIndex())) {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "Reservation_date_servicePeriod_idx"
        ON "Reservation"("date", "servicePeriod")
      `);
    }

    logInfo("admin.migration.reservation_service_period.completed", {
      requestId,
      route,
    });

    return NextResponse.json({
      ok: true,
      requestId,
    });
  } catch (error) {
    logError("admin.migration.reservation_service_period.failed", {
      requestId,
      route,
      errorCode: "ADMIN_RESERVATION_SERVICE_PERIOD_MIGRATION_FAILED",
      context: {
        message: error instanceof Error ? error.message : String(error),
      },
    });

    return apiError(500, {
      error: "Failed to migrate reservation servicePeriod",
      code: "ADMIN_RESERVATION_SERVICE_PERIOD_MIGRATION_FAILED",
      requestId,
    });
  }
}
