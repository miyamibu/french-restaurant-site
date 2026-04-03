import { describe, expect, it } from "vitest";
import {
  aggregateSlotCounts,
  evaluateReservationAvailability,
  fitsAllowedPattern,
  partySizeToSlotRequirement,
} from "@/lib/reservation-capacity";
import { jstDateTimeFromString } from "@/lib/dates";

describe("reservation capacity rules", () => {
  describe("partySizeToSlotRequirement", () => {
    it("maps party sizes into slot requirements", () => {
      expect(partySizeToSlotRequirement(1)).toBe(2);
      expect(partySizeToSlotRequirement(2)).toBe(2);
      expect(partySizeToSlotRequirement(3)).toBe(4);
      expect(partySizeToSlotRequirement(4)).toBe(4);
      expect(partySizeToSlotRequirement(5)).toBe(6);
      expect(partySizeToSlotRequirement(6)).toBe(6);
      expect(partySizeToSlotRequirement(7)).toBe(8);
      expect(partySizeToSlotRequirement(8)).toBe(8);
      expect(partySizeToSlotRequirement(9)).toBe("phone_only");
    });
  });

  describe("aggregateSlotCounts", () => {
    it("ignores cancelled reservations", () => {
      expect(
        aggregateSlotCounts([
          { partySize: 2, status: "CONFIRMED", servicePeriod: "LUNCH" },
          { partySize: 4, status: "CANCELLED", servicePeriod: "LUNCH" },
          { partySize: 7, status: "DONE", servicePeriod: "LUNCH" },
        ])
      ).toEqual({
        slot2: 1,
        slot4: 0,
        slot6: 0,
        slot8: 1,
        hasPhoneOnly: false,
      });
    });

    it("marks phone-only requirements when existing reservations are 9 or more", () => {
      expect(
        aggregateSlotCounts([{ partySize: 10, status: "CONFIRMED", servicePeriod: "DINNER" }])
      ).toEqual({
        slot2: 0,
        slot4: 0,
        slot6: 0,
        slot8: 0,
        hasPhoneOnly: true,
      });
    });
  });

  describe("fitsAllowedPattern", () => {
    it("accepts counts contained by an allowed pattern", () => {
      expect(
        fitsAllowedPattern({
          slot2: 3,
          slot4: 1,
          slot6: 0,
          slot8: 0,
          hasPhoneOnly: false,
        })
      ).toBe(true);
    });

    it("rejects counts outside all allowed patterns", () => {
      expect(
        fitsAllowedPattern({
          slot2: 0,
          slot4: 0,
          slot6: 1,
          slot8: 1,
          hasPhoneOnly: false,
        })
      ).toBe(false);
    });
  });

  describe("evaluateReservationAvailability", () => {
    it("returns BEFORE_OPENING before all other checks", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-02",
          servicePeriod: "LUNCH",
          partySize: 2,
          existingReservations: [],
        })
      ).toEqual({
        reason: "BEFORE_OPENING",
        webBookable: false,
      });
    });

    it("returns CLOSED before SAME_DAY_BLOCKED", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-06",
          servicePeriod: "LUNCH",
          partySize: 2,
          existingReservations: [],
        })
      ).toEqual({
        reason: "CLOSED",
        webBookable: false,
      });
    });

    it("returns CUTOFF_PASSED after date validity checks", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-10",
          servicePeriod: "DINNER",
          partySize: 2,
          existingReservations: [],
          now: jstDateTimeFromString("2026-04-09", "22:01"),
        })
      ).toEqual({
        reason: "CUTOFF_PASSED",
        webBookable: false,
      });
    });

    it("closes only lunch on 2026-04-25", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-25",
          servicePeriod: "LUNCH",
          partySize: 2,
          existingReservations: [],
          now: jstDateTimeFromString("2026-04-20", "12:00"),
        })
      ).toEqual({
        reason: "CLOSED",
        webBookable: false,
      });

      expect(
        evaluateReservationAvailability({
          date: "2026-04-25",
          servicePeriod: "DINNER",
          partySize: 2,
          existingReservations: [],
          now: jstDateTimeFromString("2026-04-20", "12:00"),
        })
      ).toEqual({
        reason: "OK",
        webBookable: true,
      });
    });

    it("closes only lunch on 2026-05-10", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-05-10",
          servicePeriod: "LUNCH",
          partySize: 2,
          existingReservations: [],
          now: jstDateTimeFromString("2026-05-05", "12:00"),
        })
      ).toEqual({
        reason: "CLOSED",
        webBookable: false,
      });

      expect(
        evaluateReservationAvailability({
          date: "2026-05-10",
          servicePeriod: "DINNER",
          partySize: 2,
          existingReservations: [],
          now: jstDateTimeFromString("2026-05-05", "12:00"),
        })
      ).toEqual({
        reason: "OK",
        webBookable: true,
      });
    });

    it("returns PHONE_ONLY for 9 or more", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-10",
          servicePeriod: "DINNER",
          partySize: 9,
          existingReservations: [],
          now: jstDateTimeFromString("2026-04-08", "12:00"),
        })
      ).toEqual({
        reason: "PHONE_ONLY",
        webBookable: false,
      });
    });

    it("aggregates only the matching service period", () => {
      expect(
        evaluateReservationAvailability({
          date: "2026-04-10",
          servicePeriod: "LUNCH",
          partySize: 2,
          existingReservations: [
            { partySize: 8, status: "CONFIRMED", servicePeriod: "DINNER" },
          ],
          now: jstDateTimeFromString("2026-04-08", "12:00"),
        })
      ).toEqual({
        reason: "OK",
        webBookable: true,
      });
    });
  });
});
