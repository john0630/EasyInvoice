import { describe, expect, it } from "vitest";
import {
  formatLineItemDescription,
  formatMonthYear,
  hasLineItemPeriod,
  previousMonthPeriod,
} from "./lineItemDescription";
import type { LineItemInput } from "./types";

const baseItem: LineItemInput = {
  description: "Consulting services",
  quantity: 1,
  unit_price: 100,
  tax_rate_percent: 0,
  discount_percent: 0,
};

describe("lineItemDescription", () => {
  it("formats month and year", () => {
    expect(formatMonthYear(7, 2026)).toBe("July 2026");
  });

  it("returns description only when period is not set", () => {
    expect(formatLineItemDescription(baseItem)).toBe("Consulting services");
    expect(hasLineItemPeriod(baseItem)).toBe(false);
  });

  it("appends period to description", () => {
    expect(
      formatLineItemDescription({
        ...baseItem,
        period_month: 7,
        period_year: 2026,
      }),
    ).toBe("Consulting services (July 2026)");
  });

  it("defaults previous month period from a reference date", () => {
    expect(previousMonthPeriod(new Date(2026, 6, 6))).toEqual({
      period_month: 6,
      period_year: 2026,
    });
    expect(previousMonthPeriod(new Date(2026, 0, 15))).toEqual({
      period_month: 12,
      period_year: 2025,
    });
  });
});
