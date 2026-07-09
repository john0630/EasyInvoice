import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  isLedgerImportDoc,
  KIND_LABELS,
  type DocumentKind,
} from "@easy-invoice/shared";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useDocumentOps } from "@/hooks/useDocument";
import { downloadDocumentPdfs } from "@/lib/bulkDownloadDocuments";
import { sellerFromSettings } from "@/lib/documentDefaults";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  businessToSeller,
  listBusinesses,
  type SellerInfo,
} from "@/lib/localCatalog";
import { getLocalDocument } from "@/lib/localStorage";
import type { DbDocument } from "@/lib/supabase";

type Filter = "all" | DocumentKind | "ledger";

export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { orgId, settings } = useOrganization(user?.id);
  const { listDocuments, loadDocument, removeDocument, removeDocuments, duplicateAs } =
    useDocumentOps(orgId, settings);
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [filter, setFilter] = useState<Filter>(() => {
    const tab = searchParams.get("tab");
    return tab === "ledger" ? "ledger" : "all";
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listDocuments();
      setDocs(data as DbDocument[]);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  useEffect(() => {
    setSelected(new Set());
  }, [filter]);

  const visibleDocs = useMemo(() => {
    if (filter === "ledger") {
      return docs.filter((d) => isLedgerImportDoc(d));
    }
    const regular = docs.filter((d) => !isLedgerImportDoc(d));
    if (filter === "all") return regular;
    return regular.filter((d) => d.kind === filter);
  }, [docs, filter]);

  const ledgerCount = useMemo(
    () => docs.filter((d) => isLedgerImportDoc(d)).length,
    [docs],
  );

  const allSelected =
    visibleDocs.length > 0 && selected.size === visibleDocs.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleDocs.map((d) => d.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resolveSeller = (docId: string): SellerInfo => {
    if (isSupabaseConfigured && orgId !== "local") {
      return sellerFromSettings(settings);
    }
    const local = getLocalDocument(docId);
    if (local?.business_id) {
      const business = listBusinesses().find((b) => b.id === local.business_id);
      if (business) return businessToSeller(business);
    }
    return sellerFromSettings(settings);
  };

  const handleBulkDownload = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;

    setBulkDownloading(true);
    try {
      const items: { form: NonNullable<Awaited<ReturnType<typeof loadDocument>>>; seller: SellerInfo }[] = [];
      for (const id of ids) {
        const form = await loadDocument(id);
        if (!form) {
          toast.error("One or more documents could not be loaded");
          return;
        }
        items.push({ form, seller: resolveSeller(id) });
      }

      await downloadDocumentPdfs(items);
      toast.success(
        ids.length === 1
          ? "PDF downloaded"
          : `Downloaded ${ids.length} PDFs as ZIP`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await removeDocument(id);
      toast.success("Document deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} selected document${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      await removeDocuments(ids);
      toast.success(
        `Deleted ${ids.length} document${ids.length === 1 ? "" : "s"}`,
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDuplicate = async (id: string, kind: DocumentKind) => {
    try {
      const doc = await duplicateAs(id, kind);
      toast.success(`Created ${KIND_LABELS[kind]}`);
      if (doc && "id" in doc) {
        window.location.href = `/documents/${doc.id}`;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    }
  };

  const filters: { key: Filter; label: string; badge?: number }[] = [
    { key: "all", label: "All" },
    { key: "proforma", label: "Proforma" },
    { key: "invoice", label: "Invoices" },
    { key: "receipt", label: "Receipts" },
    { key: "ledger", label: "Ledger imports", badge: ledgerCount || undefined },
  ];

  const isLedgerTab = filter === "ledger";
  const bulkBusy = bulkDeleting || bulkDownloading;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Link
            to="/documents/import"
            className="text-sm border border-brand text-brand px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            Import Excel
          </Link>
          {(["invoice", "proforma", "receipt"] as DocumentKind[]).map((k) => (
            <Link
              key={k}
              to={`/documents/new/${k}`}
              className="text-sm bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark"
            >
              + {KIND_LABELS[k]}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filter === f.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
            {f.badge !== undefined && f.badge > 0 && (
              <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">
                {f.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {visibleDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              className="rounded border-slate-300"
            />
            Select all
          </label>
          <span className="text-sm text-slate-500">
            {selected.size} of {visibleDocs.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || bulkBusy}
              onClick={() => void handleBulkDownload()}
              className="text-sm text-brand hover:text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {bulkDownloading
                ? "Downloading…"
                : selected.size <= 1
                  ? "Download PDF"
                  : `Download PDFs (${selected.size})`}
            </button>
            {isLedgerTab && (
              <button
                type="button"
                disabled={selected.size === 0 || bulkBusy}
                onClick={() => void handleBulkDelete()}
                className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {bulkDeleting
                  ? "Deleting…"
                  : `Delete selected (${selected.size})`}
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : visibleDocs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          {isLedgerTab ? (
            <>
              <p className="text-slate-500 mb-4">No ledger imports yet.</p>
              <Link to="/documents/import" className="text-brand font-medium">
                Import from Excel →
              </Link>
            </>
          ) : (
            <>
              <p className="text-slate-500 mb-4">No documents yet.</p>
              <Link to="/documents/new/invoice" className="text-brand font-medium">
                Create your first invoice →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleOne(doc.id)}
                className="rounded border-slate-300"
                aria-label={`Select ${doc.number || "document"}`}
              />
              <div className="flex-1 min-w-[200px]">
                <Link
                  to={`/documents/${doc.id}`}
                  className="font-semibold text-slate-800 hover:text-brand"
                >
                  {doc.number || "Draft"}
                </Link>
                <p className="text-sm text-slate-500">
                  {KIND_LABELS[doc.kind]} · {doc.buyer_name || "No buyer"} ·{" "}
                  {isLedgerTab
                    ? new Date(doc.issue_date).toLocaleDateString()
                    : new Date(doc.updated_at).toLocaleDateString()}
                </p>
              </div>
              <span className="font-medium text-slate-700">
                {doc.currency} {Number(doc.grand_total).toFixed(2)}
              </span>
              <div className="flex gap-2">
                {!isLedgerTab && doc.kind === "proforma" && (
                  <button
                    onClick={() => handleDuplicate(doc.id, "invoice")}
                    className="text-xs text-slate-500 hover:text-brand"
                  >
                    → Invoice
                  </button>
                )}
                {!isLedgerTab && doc.kind === "invoice" && (
                  <button
                    onClick={() => handleDuplicate(doc.id, "receipt")}
                    className="text-xs text-slate-500 hover:text-brand"
                  >
                    → Receipt
                  </button>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
