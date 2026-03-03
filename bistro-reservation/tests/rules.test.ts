import { addMonths } from "date-fns";
import { describe, it, expect } from "vitest";
import {
  isArrivalTimeValid,
  isWithinAcceptance,
  MAIN_CAPACITY,
} from "@/lib/availability";
import { todayJst, jstDateFromString, formatJst } from "@/lib/dates";

describe("Availability Rules", () => {
  describe("isArrivalTimeValid", () => {
    it("should accept valid arrival times - 17:30", () => {
      expect(isArrivalTimeValid("17:30")).toBe(true);
    });

    it("should accept valid arrival times - 18:00", () => {
      expect(isArrivalTimeValid("18:00")).toBe(true);
    });

    it("should accept valid arrival times - 23:59", () => {
      expect(isArrivalTimeValid("23:59")).toBe(true);
    });

    it("should reject before 17:30", () => {
      expect(isArrivalTimeValid("17:29")).toBe(false);
      expect(isArrivalTimeValid("17:00")).toBe(false);
      expect(isArrivalTimeValid("12:00")).toBe(false);
    });

    it("should reject invalid format", () => {
      expect(isArrivalTimeValid("not-time")).toBe(false);
      expect(isArrivalTimeValid("25:00")).toBe(false);
      expect(isArrivalTimeValid("12:60")).toBe(false);
    });

    it("should handle null/undefined", () => {
      expect(isArrivalTimeValid(null)).toBe(true);
      expect(isArrivalTimeValid(undefined)).toBe(true);
    });
  });

  describe("isWithinAcceptance", () => {
    it("should reject today", () => {
      const today = formatJst(todayJst());
      expect(isWithinAcceptance(today)).toBe(false);
    });

    it("should accept tomorrow", () => {
      const tomorrow = formatJst(new Date(todayJst().getTime() + 86400000));
      expect(isWithinAcceptance(tomorrow)).toBe(true);
    });

    it("should accept dates within 3 months", () => {
      const date30d = formatJst(new Date(todayJst().getTime() + 30 * 86400000));
      expect(isWithinAcceptance(date30d)).toBe(true);
    });

    it("should accept date at 3-month boundary", () => {
      const dateAtBoundary = formatJst(addMonths(todayJst(), 3));
      expect(isWithinAcceptance(dateAtBoundary)).toBe(true);
    });

    it("should reject beyond 3 months", () => {
      const dateBeyondBoundary = formatJst(new Date(addMonths(todayJst(), 3).getTime() + 86400000));
      expect(isWithinAcceptance(dateBeyondBoundary)).toBe(false);
    });

    it("should reject past dates", () => {
      const yesterday = formatJst(new Date(todayJst().getTime() - 86400000));
      expect(isWithinAcceptance(yesterday)).toBe(false);
    });
  });

  describe("MAIN_CAPACITY constant", () => {
    it("should have MAIN_CAPACITY set to 12", () => {
      expect(MAIN_CAPACITY).toBe(12);
    });
  });

  describe("Business day rules", () => {
    it("should indicate valid date format handling", () => {
      // This test verifies that dates are properly parsed as JST
      const dateStr = "2026-02-24";
      const parsed = jstDateFromString(dateStr);
      const formatted = formatJst(parsed);
      expect(formatted).toBe(dateStr);
    });
  });
});
