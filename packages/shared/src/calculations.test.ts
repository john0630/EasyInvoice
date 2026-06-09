import { describe, it, expect } from "vitest";
import { calculateTotals } from "./calculations";
import type { LineItemInput } from "./types";

describe("calculateTotals", () => {
  it("sums line items with tax and discount", () => {
    const items: LineItemInput[] = [
      {
        description: "A",
        quantity: 2,
        unit_price: 100,
        tax_rate_percent: 10,
        discount_percent: 0,
      },
      {
        description: "B",
        quantity: 1,
        unit_price: 50,
        tax_rate_percent: 0,
        discount_percent: 10,
      },
    ];
    const result = calculateTotals(items);
    expect(result.subtotal).toBe(250);
    expect(result.tax_total).toBe(20);
    expect(result.discount_total).toBe(5);
    expect(result.grand_total).toBe(265);
  });
});
