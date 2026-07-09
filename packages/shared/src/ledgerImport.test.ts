import { describe, it, expect } from "vitest";
import {
  requiresInvoice,
  skipReason,
  creditToUnitPrice,
  ledgerRowsToInvoices,
  previewInvoiceTotal,
  isLedgerImportDoc,
  DEFAULT_POS_BUYER_NAME,
} from "./ledgerImport";
import type { LedgerRow } from "./ledgerImport";

const baseOptions = {
  currency: "MYR",
  defaultTaxRate: 6,
  taxInclusive: true,
};

describe("requiresInvoice", () => {
  it("requires invoice when project is blank, including cash sales", () => {
    const row: LedgerRow = {
      date: "2025-01-24",
      description: "MUHAMMAD AYMAN FIRDA",
      project: "",
      credit: 35.9,
      refNo1: "RV 15/01",
      refNo2: "TRANSFER",
    };
    expect(requiresInvoice(row)).toBe(true);
  });

  it("requires invoice for cash sales when project is blank", () => {
    expect(
      requiresInvoice({
        date: "2025-01-09",
        description: "CASH",
        credit: 1,
      }),
    ).toBe(true);
  });

  it("skips when project already has invoice reference", () => {
    expect(
      requiresInvoice({
        date: "2025-03-14",
        description: "610 RACING",
        project: "INV 12032025-001",
        credit: 170,
      }),
    ).toBe(false);
  });

  it("skips rows without credit", () => {
    expect(
      requiresInvoice({
        date: "2025-01-09",
        description: "DMS",
        credit: 0,
      }),
    ).toBe(false);
  });
});

describe("skipReason", () => {
  it("explains already invoiced rows", () => {
    const reason = skipReason({
      date: "2025-06-07",
      description: "SYAFIQ",
      project: "INV 202506060001",
      credit: 1500,
    });
    expect(reason).toContain("Already invoiced");
  });
});

describe("creditToUnitPrice", () => {
  it("backs out SST from tax-inclusive credit", () => {
    expect(creditToUnitPrice(106, 6, true)).toBe(100);
    expect(creditToUnitPrice(35.9, 6, true)).toBe(33.87);
  });

  it("uses credit as unit price when tax exclusive", () => {
    expect(creditToUnitPrice(100, 6, false)).toBe(100);
  });
});

describe("ledgerRowsToInvoices", () => {
  const sampleRows: LedgerRow[] = [
    {
      date: "2025-01-09",
      description: "CASH",
      credit: 1,
      refNo1: "RV 05/01",
    },
    {
      date: "2025-01-24",
      description: "MUHAMMAD AYMAN FIRDA",
      project: "",
      credit: 35.9,
      refNo1: "RV 15/01",
      refNo2: "TRANSFER",
    },
    {
      date: "2025-03-14",
      description: "610 RACING",
      project: "INV 12032025-001",
      credit: 170,
    },
    {
      date: "2025-02-14",
      description: "DMS",
      credit: 18.7,
      refNo1: "RV 10/02",
    },
  ];

  it("creates one invoice per qualifying row", () => {
    const result = ledgerRowsToInvoices(sampleRows, baseOptions);
    expect(result.invoices).toHaveLength(3);
    expect(result.skipped).toHaveLength(1);
    expect(result.invoices[0].buyer_name).toBe(DEFAULT_POS_BUYER_NAME);
    expect(result.invoices[0].issue_date).toBe("2025-01-09");
    expect(result.invoices[0].notes).toBe("");
  });

  it("tags invoices with ledger import source", () => {
    const result = ledgerRowsToInvoices(sampleRows, baseOptions);
    expect(result.invoices[0].import_source).toBe("ledger");
  });

  it("grand total matches ledger credit with inclusive tax", () => {
    const result = ledgerRowsToInvoices(sampleRows, baseOptions);
    const inv = result.invoices.find((i) => i.issue_date === "2025-01-24")!;
    const { totals, matchesCredit } = previewInvoiceTotal(inv, 35.9);
    expect(matchesCredit).toBe(true);
    expect(totals.grand_total).toBe(35.9);
  });
});

describe("isLedgerImportDoc", () => {
  it("detects by import_source field", () => {
    expect(isLedgerImportDoc({ import_source: "ledger" })).toBe(true);
  });

  it("detects legacy imports by notes marker", () => {
    expect(
      isLedgerImportDoc({
        notes: "Tax invoice. Cash sales ledger reference: RV 01/01.",
      }),
    ).toBe(true);
  });
});
