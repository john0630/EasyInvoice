import { describe, it, expect } from "vitest";
import { validateDocument } from "./schemas";

const base = {
  number: "INV-001",
  issue_date: "2026-06-09",
  currency: "USD",
  notes: "",
  template_id: "classic" as const,
  buyer_name: "Acme Corp",
  buyer_address: "123 Main St",
  buyer_email: "billing@acme.com",
  line_items: [
    {
      description: "Service",
      quantity: 1,
      unit_price: 100,
      tax_rate_percent: 0,
      discount_percent: 0,
    },
  ],
};

describe("validateDocument", () => {
  it("requires due_date when show_due_info is enabled", () => {
    const result = validateDocument(
      { ...base, show_due_info: true, payment_terms: "Net 30" },
      "invoice",
    );
    expect(result.success).toBe(false);
  });

  it("allows invoice without due_date when show_due_info is off", () => {
    const result = validateDocument({ ...base }, "invoice");
    expect(result.success).toBe(true);
  });

  it("passes valid invoice", () => {
    const result = validateDocument(
      { ...base, due_date: "2026-07-09", payment_terms: "Net 30" },
      "invoice",
    );
    expect(result.success).toBe(true);
  });

  it("requires paid_at for receipt", () => {
    const result = validateDocument(
      { ...base, payment_method: "card", amount_paid: 100 },
      "receipt",
    );
    expect(result.success).toBe(false);
  });
});
