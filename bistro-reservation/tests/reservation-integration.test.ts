import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isArrivalTimeValid, isCoursePeriodConsistent } from "@/lib/availability";
import { buildReservationAdvisoryLockKey } from "@/lib/reservation-lock";
import { evaluateReservationAvailability } from "@/lib/reservation-capacity";
import { jstDateTimeFromString } from "@/lib/dates";

const stableNow = jstDateTimeFromString("2026-04-08", "12:00");

describe("reservation integration scenarios", () => {
  it("splits OK and PHONE_ONLY by party size within the same date and service period", () => {
    const existingReservations = [
      { partySize: 8, status: "CONFIRMED" as const, servicePeriod: "DINNER" as const },
      { partySize: 4, status: "CONFIRMED" as const, servicePeriod: "DINNER" as const },
    ];

    expect(
      evaluateReservationAvailability({
        date: "2026-04-10",
        servicePeriod: "DINNER",
        partySize: 2,
        existingReservations,
        now: stableNow,
      })
    ).toEqual({
      reason: "OK",
      webBookable: true,
    });

    expect(
      evaluateReservationAvailability({
        date: "2026-04-10",
        servicePeriod: "DINNER",
        partySize: 8,
        existingReservations,
        now: stableNow,
      })
    ).toEqual({
      reason: "PHONE_ONLY",
      webBookable: false,
    });
  });

  it("returns to OK when a conflicting reservation is cancelled", () => {
    expect(
      evaluateReservationAvailability({
        date: "2026-04-10",
        servicePeriod: "LUNCH",
        partySize: 4,
        existingReservations: [
          { partySize: 8, status: "CONFIRMED", servicePeriod: "LUNCH" },
          { partySize: 4, status: "CONFIRMED", servicePeriod: "LUNCH" },
          { partySize: 2, status: "CONFIRMED", servicePeriod: "LUNCH" },
        ],
        now: stableNow,
      })
    ).toEqual({
      reason: "PHONE_ONLY",
      webBookable: false,
    });

    expect(
      evaluateReservationAvailability({
        date: "2026-04-10",
        servicePeriod: "LUNCH",
        partySize: 4,
        existingReservations: [
          { partySize: 8, status: "CONFIRMED", servicePeriod: "LUNCH" },
          { partySize: 4, status: "CANCELLED", servicePeriod: "LUNCH" },
          { partySize: 2, status: "CANCELLED", servicePeriod: "LUNCH" },
        ],
        now: stableNow,
      })
    ).toEqual({
      reason: "OK",
      webBookable: true,
    });
  });

  it("uses different advisory lock keys per service period", () => {
    expect(buildReservationAdvisoryLockKey("2026-04-10", "LUNCH")).not.toBe(
      buildReservationAdvisoryLockKey("2026-04-10", "DINNER")
    );
  });

  it("rejects service period and arrival time mismatches", () => {
    expect(isArrivalTimeValid("18:00", "LUNCH")).toBe(false);
    expect(isCoursePeriodConsistent("ディナー: 席のみ", "LUNCH")).toBe(false);
  });

  it("keeps a migration failure guard for unbackfillable rows", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260311130000_add_service_period_to_reservation",
        "migration.sql"
      ),
      "utf8"
    );

    expect(migration).toContain('WHERE "servicePeriod" IS NULL');
    expect(migration).toContain("backfill failed");
    expect(migration).toContain("RAISE EXCEPTION");
  });
});
