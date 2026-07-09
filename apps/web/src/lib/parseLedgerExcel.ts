import * as XLSX from "xlsx";
import type { LedgerRow } from "@easy-invoice/shared";

function excelDateToIso(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  return null;
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cellNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (cellString(row[0]) === "Date" && cellString(row[4]) === "Desp.") {
      return i;
    }
  }
  return -1;
}

function rowToLedger(cells: unknown[]): LedgerRow | null {
  const date = excelDateToIso(cells[0]);
  if (!date) return null;

  const description = cellString(cells[4]);
  if (!description || description.toUpperCase() === "BALANCE B/F") return null;

  return {
    date,
    batch: cellNumber(cells[1]),
    refNo1: cellString(cells[2]) || undefined,
    refNo2: cellString(cells[3]) || undefined,
    description,
    project: cellString(cells[5]) || undefined,
    job: cellString(cells[6]) || undefined,
    debit: cellNumber(cells[7]),
    credit: cellNumber(cells[8]),
  };
}

export function parseLedgerWorkbook(buffer: ArrayBuffer): LedgerRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    throw new Error(
      "Could not find ledger header row (expected columns: Date, Desp., Project, Credit).",
    );
  }

  const ledgerRows: LedgerRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    const parsed = rowToLedger(row);
    if (parsed) ledgerRows.push(parsed);
  }

  return ledgerRows;
}

export function parseLedgerExcelFile(file: File): Promise<LedgerRow[]> {
  return file.arrayBuffer().then(parseLedgerWorkbook);
}
