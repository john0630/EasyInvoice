import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_LINE_ITEM_DESCRIPTION,
  DEFAULT_POS_BUYER_ADDRESS,
  DEFAULT_POS_BUYER_NAME,
  formatAmount,
  formatMoney,
  ledgerRowsToInvoices,
  previewInvoiceTotal,
  type LedgerImportOptions,
  type LedgerRow,
} from "@easy-invoice/shared";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocalCatalog } from "@/hooks/useLocalCatalog";
import { useDocumentOps } from "@/hooks/useDocument";
import { parseLedgerExcelFile } from "@/lib/parseLedgerExcel";
import { isSupabaseConfigured } from "@/lib/supabase";
import { businessToSeller, type SellerInfo } from "@/lib/localCatalog";
import { sellerFromSettings } from "@/lib/documentDefaults";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 text-sm";

function previewRowKey(row: LedgerRow, index: number): string {
  return `${index}:${row.date}:${row.refNo1 ?? ""}:${row.refNo2 ?? ""}:${row.credit ?? ""}`;
}

export function ImportPage() {
  const navigate = useNavigate();
  const localMode = !isSupabaseConfigured;
  const { user } = useAuth();
  const { orgId, settings } = useOrganization(user?.id);
  const catalog = useLocalCatalog();

  const [seller, setSeller] = useState<SellerInfo>(
    localMode ? catalog.seller : sellerFromSettings(settings),
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState(
    catalog.activeBusinessId,
  );

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [buyerName, setBuyerName] = useState(DEFAULT_POS_BUYER_NAME);
  const [buyerAddress, setBuyerAddress] = useState(DEFAULT_POS_BUYER_ADDRESS);
  const [lineItemDescription, setLineItemDescription] = useState(
    DEFAULT_LINE_ITEM_DESCRIPTION,
  );
  const [taxRate, setTaxRate] = useState(settings?.default_tax_rate ?? 6);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());

  const { saveDocument } = useDocumentOps(
    orgId,
    settings,
    localMode ? seller : undefined,
  );

  const importOptions: LedgerImportOptions = useMemo(
    () => ({
      currency: settings?.currency ?? "MYR",
      defaultTaxRate: taxRate,
      buyerName,
      buyerAddress,
      lineItemDescription,
      taxInclusive,
    }),
    [
      settings?.currency,
      taxRate,
      buyerName,
      buyerAddress,
      lineItemDescription,
      taxInclusive,
    ],
  );

  const importResult = useMemo(() => {
    if (!rows) return null;
    return ledgerRowsToInvoices(rows, importOptions);
  }, [rows, importOptions]);

  useEffect(() => {
    if (!importResult) {
      setSelectedRowKeys(new Set());
      return;
    }
    setSelectedRowKeys(
      new Set(
        importResult.qualifying.map((row, index) => previewRowKey(row, index)),
      ),
    );
  }, [importResult]);

  const allRowsSelected =
    importResult !== null &&
    importResult.qualifying.length > 0 &&
    selectedRowKeys.size === importResult.qualifying.length;
  const someRowsSelected =
    selectedRowKeys.size > 0 &&
    importResult !== null &&
    selectedRowKeys.size < importResult.qualifying.length;

  const toggleAllRows = () => {
    if (!importResult) return;
    if (allRowsSelected) {
      setSelectedRowKeys(new Set());
    } else {
      setSelectedRowKeys(
        new Set(
          importResult.qualifying.map((row, index) => previewRowKey(row, index)),
        ),
      );
    }
  };

  const toggleRow = (key: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setFileName(file.name);
    try {
      const parsed = await parseLedgerExcelFile(file);
      setRows(parsed);
      if (parsed.length === 0) {
        toast.warning("No transaction rows found in the spreadsheet.");
      }
    } catch (e) {
      setRows(null);
      const msg = e instanceof Error ? e.message : "Failed to parse Excel file";
      setParseError(msg);
      toast.error(msg);
    }
  }, []);

  const handleBusinessChange = (id: string) => {
    setSelectedBusinessId(id);
    catalog.selectBusiness(id);
    const business = catalog.businesses.find((b) => b.id === id);
    if (business) setSeller(businessToSeller(business));
  };

  const handleGenerate = async () => {
    if (!importResult || importResult.invoices.length === 0) {
      toast.error("No invoices to generate.");
      return;
    }

    const selected = importResult.qualifying
      .map((row, index) => ({
        row,
        invoice: importResult.invoices[index],
        key: previewRowKey(row, index),
      }))
      .filter(({ key }) => selectedRowKeys.has(key));

    if (selected.length === 0) {
      toast.error("Select at least one row to generate.");
      return;
    }

    setGenerating(true);
    let created = 0;
    const errors: string[] = [];

    try {
      for (const { invoice, row } of selected) {
        try {
          await saveDocument(
            invoice,
            undefined,
            localMode ? selectedBusinessId : undefined,
          );
          if (localMode) {
            catalog.recordFromDocument(invoice, seller);
          }
          created++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Save failed";
          errors.push(`${row.date}: ${msg}`);
        }
      }

      if (created > 0) {
        toast.success(`Created ${created} invoice${created === 1 ? "" : "s"}`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} invoice(s) failed to save`);
        console.error(errors);
      }
      if (created > 0) {
        navigate("/documents?tab=ledger");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/documents"
          className="text-sm text-brand hover:underline mb-2 inline-block"
        >
          ← Back to Documents
        </Link>
        <h1 className="text-2xl font-bold">Import from Excel Ledger</h1>
        <p className="text-slate-600 mt-2 text-sm max-w-2xl">
          Upload a cash-sales ledger export (.xlsx). Invoices are auto-generated
          for each row with a <strong>Credit</strong> amount and a blank{" "}
          <strong>Project</strong> column — including CASH sales — one tax
          invoice per transaction for Malaysian SST records.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800">1. Upload ledger</h2>
          <label className="block">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand file:text-white file:cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          {fileName && (
            <p className="text-xs text-slate-500">
              Loaded: {fileName}
              {rows && ` — ${rows.length} transaction row(s)`}
            </p>
          )}
          {parseError && (
            <p className="text-sm text-red-600">{parseError}</p>
          )}
        </section>

        <section className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800">2. Invoice settings</h2>

          {localMode ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                From (Seller)
              </span>
              <select
                className={inputClass}
                value={selectedBusinessId}
                onChange={(e) => handleBusinessChange(e.target.value)}
              >
                {catalog.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || "Unnamed business"}
                  </option>
                ))}
              </select>
              {seller.seller_tax_id && (
                <p className="text-xs text-slate-500">
                  SST / Tax ID: {seller.seller_tax_id}
                </p>
              )}
            </label>
          ) : (
            <div className="text-sm text-slate-600 rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-800">
                From: {settings?.seller_name || "—"}
              </p>
              {settings?.seller_tax_id && (
                <p className="text-xs mt-1">
                  SST / Tax ID: {settings.seller_tax_id}
                </p>
              )}
              <p className="text-xs mt-2 text-slate-500">
                Seller profile is managed in Settings.
              </p>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Bill To
            </span>
            <input
              className={inputClass}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder={DEFAULT_POS_BUYER_NAME}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Buyer address
            </span>
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Line item description
            </span>
            <input
              className={inputClass}
              value={lineItemDescription}
              onChange={(e) => setLineItemDescription(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Standard-rated supply description for SST justification.
            </p>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                SST rate (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className={inputClass}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
              />
            </label>
            <label className="flex items-end gap-2 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">
                Credit amount is SST-inclusive
              </span>
            </label>
          </div>
        </section>
      </div>

      {importResult && (
        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="font-semibold text-slate-800">3. Preview</h2>
            <div className="flex gap-3 text-sm">
              <span className="text-green-700 bg-green-50 px-2 py-1 rounded">
                {selectedRowKeys.size} of {importResult.invoices.length} selected
              </span>
              <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded">
                {importResult.skipped.length} skipped
              </span>
            </div>
          </div>

          {importResult.invoices.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allRowsSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someRowsSelected;
                    }}
                    onChange={toggleAllRows}
                    className="rounded border-slate-300"
                  />
                  Select all
                </label>
                <span className="text-sm text-slate-500">
                  Choose which rows to generate as invoices
                </span>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-3 w-8" />
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Ledger Desp.</th>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3 text-right">Credit</th>
                    <th className="py-2 text-right">Invoice total</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.qualifying.map((row, i) => {
                    const inv = importResult.invoices[i];
                    const key = previewRowKey(row, i);
                    const { totals } = previewInvoiceTotal(
                      inv,
                      row.credit,
                    );
                    return (
                      <tr key={key} className="border-b border-slate-100">
                        <td className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={selectedRowKeys.has(key)}
                            onChange={() => toggleRow(key)}
                            className="rounded border-slate-300"
                            aria-label={`Select ${row.date} ${row.description}`}
                          />
                        </td>
                        <td className="py-2 pr-3">{row.date}</td>
                        <td className="py-2 pr-3">{row.description}</td>
                        <td className="py-2 pr-3 text-slate-500">
                          {[row.refNo1, row.refNo2].filter(Boolean).join(" / ")}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {formatAmount(row.credit ?? 0)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatMoney(
                            totals.grand_total,
                            importOptions.currency,
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              No rows qualify for invoicing. Rows are skipped when Project has
              an invoice reference or Credit is empty.
            </p>
          )}

          {importResult.skipped.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-slate-500 cursor-pointer">
                Show {importResult.skipped.length} skipped row(s)
              </summary>
              <ul className="mt-2 text-xs text-slate-500 space-y-1 max-h-40 overflow-y-auto">
                {importResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.row.date} — {s.row.description || "(no desp.)"}:{" "}
                    {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              disabled={
                generating ||
                importResult.invoices.length === 0 ||
                selectedRowKeys.size === 0
              }
              onClick={() => void handleGenerate()}
              className="bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating
                ? "Generating…"
                : `Generate ${selectedRowKeys.size} invoice${selectedRowKeys.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
