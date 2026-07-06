import type { LineItemInput } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatMonthYear(month: number, year: number): string {
  if (month < 1 || month > 12) return "";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function hasLineItemPeriod(item: Pick<LineItemInput, "period_month" | "period_year">): boolean {
  return (
    typeof item.period_month === "number" &&
    item.period_month >= 1 &&
    item.period_month <= 12 &&
    typeof item.period_year === "number" &&
    item.period_year >= 1900
  );
}

export function formatLineItemDescription(item: LineItemInput): string {
  const description = item.description.trim();
  if (!hasLineItemPeriod(item)) {
    return description || "—";
  }
  const period = formatMonthYear(item.period_month!, item.period_year!);
  if (!description) return `(${period})`;
  return `${description} (${period})`;
}

export const LINE_ITEM_MONTHS = MONTH_NAMES.map((label, index) => ({
  value: index + 1,
  label,
}));

export function lineItemYearOptions(
  centerYear = new Date().getFullYear(),
  span = 6,
): number[] {
  const years: number[] = [];
  for (let year = centerYear - span; year <= centerYear + span; year++) {
    years.push(year);
  }
  return years;
}

export function previousMonthPeriod(reference = new Date()): {
  period_month: number;
  period_year: number;
} {
  const d = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return {
    period_month: d.getMonth() + 1,
    period_year: d.getFullYear(),
  };
}
