import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { KIND_LABELS, type DocumentKind } from "@easy-invoice/shared";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useDocumentOps } from "@/hooks/useDocument";
import type { DbDocument } from "@/lib/supabase";

type Filter = "all" | DocumentKind;

export function DocumentsPage() {
  const { user } = useAuth();
  const { orgId, settings } = useOrganization(user?.id);
  const { listDocuments, removeDocument, duplicateAs } = useDocumentOps(orgId, settings);
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const kind = filter === "all" ? undefined : filter;
      const data = await listDocuments(kind);
      setDocs(data as DbDocument[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter, orgId]);

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

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "proforma", label: "Proforma" },
    { key: "invoice", label: "Invoices" },
    { key: "receipt", label: "Receipts" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
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

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 mb-4">No documents yet.</p>
          <Link to="/documents/new/invoice" className="text-brand font-medium">
            Create your first invoice →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex-1 min-w-[200px]">
                <Link
                  to={`/documents/${doc.id}`}
                  className="font-semibold text-slate-800 hover:text-brand"
                >
                  {doc.number || "Draft"}
                </Link>
                <p className="text-sm text-slate-500">
                  {KIND_LABELS[doc.kind]} · {doc.buyer_name || "No buyer"} ·{" "}
                  {new Date(doc.updated_at).toLocaleDateString()}
                </p>
              </div>
              <span className="font-medium text-slate-700">
                {doc.currency} {Number(doc.grand_total).toFixed(2)}
              </span>
              <div className="flex gap-2">
                {doc.kind === "proforma" && (
                  <button
                    onClick={() => handleDuplicate(doc.id, "invoice")}
                    className="text-xs text-slate-500 hover:text-brand"
                  >
                    → Invoice
                  </button>
                )}
                {doc.kind === "invoice" && (
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
