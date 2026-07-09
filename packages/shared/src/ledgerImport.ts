import type { DocumentFormData, LineItemInput } from "./types";
import { calculateTotals } from "./calculations";

/** Ledger row parsed from a cash-sales Excel export. */
export interface LedgerRow {
  date: string;
  batch?: number;
  refNo1?: string;
  refNo2?: string;
  description: string;
  project?: string;
  job?: string;
  debit?: number;
  credit?: number;
}

export const DEFAULT_POS_BUYER_NAME = "Walk-in Customer (POS)";
export const DEFAULT_POS_BUYER_ADDRESS =
  "General Public — Retail Point of Sale";
export const DEFAULT_LINE_ITEM_DESCRIPTION =
  "Retail sale of motorcycle parts & accessories";

export interface LedgerImportOptions {
  currency: string;
  defaultTaxRate: number;
  buyerName?: string;
  buyerAddress?: string;
  lineItemDescription?: string;
  /** When true, credit amount is treated as tax-inclusive (typical Malaysian retail). */
  taxInclusive?: boolean;
}

export interface SkippedLedgerRow {
  row: LedgerRow;
  reason: string;
}

export interface LedgerImportResult {
  invoices: DocumentFormData[];
  qualifying: LedgerRow[];
  skipped: SkippedLedgerRow[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Whether a ledger row needs a tax invoice per business rules. */
export function requiresInvoice(row: LedgerRow): boolean {
  const credit = row.credit ?? 0;
  if (credit <= 0) return false;

  const project = (row.project ?? "").trim();
  if (project) return false;

  return true;
}

export function skipReason(row: LedgerRow): string | null {
  const credit = row.credit ?? 0;
  if (credit <= 0) return "No credit amount";

  const project = (row.project ?? "").trim();
  if (project) return `Already invoiced (${project})`;

  return null;
}

export function creditToUnitPrice(
  credit: number,
  taxRatePercent: number,
  taxInclusive: boolean,
): number {
  if (!taxInclusive || taxRatePercent === 0) return round2(credit);
  return round2(credit / (1 + taxRatePercent / 100));
}

function defaultInvoiceBase(
  options: LedgerImportOptions,
): Pick<
  DocumentFormData,
  | "kind"
  | "number"
  | "currency"
  | "template_id"
  | "buyer_name"
  | "buyer_address"
  | "buyer_email"
  | "show_due_info"
  | "due_date"
  | "payment_terms"
> {
  return {
    kind: "invoice",
    number: "",
    currency: options.currency,
    template_id: "classic",
    buyer_name: options.buyerName ?? DEFAULT_POS_BUYER_NAME,
    buyer_address: options.buyerAddress ?? DEFAULT_POS_BUYER_ADDRESS,
    buyer_email: "",
    show_due_info: false,
    due_date: undefined,
    payment_terms: undefined,
  };
}

export function ledgerRowToLineItem(
  row: LedgerRow,
  options: LedgerImportOptions,
): LineItemInput {
  const taxRate = options.defaultTaxRate;
  const taxInclusive = options.taxInclusive ?? true;
  const credit = row.credit ?? 0;

  return {
    description: options.lineItemDescription ?? DEFAULT_LINE_ITEM_DESCRIPTION,
    quantity: 1,
    unit_price: creditToUnitPrice(credit, taxRate, taxInclusive),
    tax_rate_percent: taxRate,
    discount_percent: 0,
    period_month: new Date(row.date + "T00:00:00").getMonth() + 1,
    period_year: new Date(row.date + "T00:00:00").getFullYear(),
  };
}

export function ledgerRowToInvoice(
  row: LedgerRow,
  options: LedgerImportOptions,
): DocumentFormData {
  const lineItem = ledgerRowToLineItem(row, options);

  return {
    ...defaultInvoiceBase(options),
    issue_date: row.date,
    notes: "",
    import_source: "ledger",
    line_items: [lineItem],
  };
}

const LEDGER_NOTE_MARKER = "Cash sales ledger reference:";

/** Detect invoices created from Excel ledger import (incl. older saves without import_source). */
export function isLedgerImportDoc(doc: {
  import_source?: string | null;
  notes?: string | null;
}): boolean {
  if (doc.import_source === "ledger") return true;
  return (doc.notes ?? "").includes(LEDGER_NOTE_MARKER);
}

/** Partition rows into qualifying invoices vs skipped with reasons. */
export function partitionLedgerRows(rows: LedgerRow[]): {
  qualifying: LedgerRow[];
  skipped: SkippedLedgerRow[];
} {
  const qualifying: LedgerRow[] = [];
  const skipped: SkippedLedgerRow[] = [];

  for (const row of rows) {
    const reason = skipReason(row);
    if (reason) {
      skipped.push({ row, reason });
    } else {
      qualifying.push(row);
    }
  }

  return { qualifying, skipped };
}

export function ledgerRowsToInvoices(
  rows: LedgerRow[],
  options: LedgerImportOptions,
): LedgerImportResult {
  const { qualifying, skipped } = partitionLedgerRows(rows);
  const invoices = qualifying.map((row) => ledgerRowToInvoice(row, options));

  return { invoices, qualifying, skipped };
}

/** Preview grand total for a generated invoice (validates tax math). */
export function previewInvoiceTotal(
  invoice: DocumentFormData,
  expectedCredit?: number,
): { totals: ReturnType<typeof calculateTotals>; matchesCredit: boolean } {
  const totals = calculateTotals(invoice.line_items);
  const matchesCredit =
    expectedCredit === undefined ||
    Math.abs(totals.grand_total - expectedCredit) < 0.02;
  return { totals, matchesCredit };
}
