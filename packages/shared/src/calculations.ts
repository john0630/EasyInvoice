import type { LineItemInput, Totals } from "./types";

export function calculateTotals(items: LineItemInput[]): Totals {
  let subtotal = 0;
  let tax_total = 0;
  let discount_total = 0;

  for (const item of items) {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = lineSubtotal * (item.discount_percent / 100);
    const taxable = lineSubtotal - lineDiscount;
    const lineTax = taxable * (item.tax_rate_percent / 100);
    subtotal += lineSubtotal;
    discount_total += lineDiscount;
    tax_total += lineTax;
  }

  return {
    subtotal: round2(subtotal),
    tax_total: round2(tax_total),
    discount_total: round2(discount_total),
    grand_total: round2(subtotal - discount_total + tax_total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
