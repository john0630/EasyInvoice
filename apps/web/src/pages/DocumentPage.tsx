import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  calculateTotals,
  type DocumentFormData,
  type DocumentKind,
} from "@easy-invoice/shared";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { HtmlPreview } from "@/components/preview/HtmlPreview";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useLocalCatalog } from "@/hooks/useLocalCatalog";
import { useDocumentOps } from "@/hooks/useDocument";
import { createDefaultDocument } from "@/lib/documentDefaults";
import { previewBusinessDocumentNumber } from "@/lib/localCatalog";
import { previewDocumentNumber } from "@/lib/localSettings";
import { buildPdfFilename, downloadPdf } from "@/lib/downloadPdf";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  businessToSeller,
  listBusinesses,
  type SavedBuyer,
  type SavedNotePreset,
  type SellerInfo,
} from "@/lib/localCatalog";
import { getLocalDocument } from "@/lib/localStorage";

export function DocumentPage() {
  const { id, kind: kindParam } = useParams<{ id?: string; kind?: string }>();
  const navigate = useNavigate();
  const isNew = Boolean(kindParam);
  const kind = (kindParam ?? "invoice") as DocumentKind;
  const localMode = !isSupabaseConfigured;

  const { user } = useAuth();
  const { orgId, settings } = useOrganization(user?.id);
  const catalog = useLocalCatalog();

  const [seller, setSeller] = useState<SellerInfo>(
    localMode ? catalog.seller : { seller_name: "", seller_address: "", seller_email: "", seller_phone: "", seller_tax_id: "" },
  );

  const { loadDocument, saveDocument, seller: cloudSeller } = useDocumentOps(
    orgId,
    settings,
    localMode ? seller : undefined,
  );

  const [form, setForm] = useState<DocumentFormData | null>(null);
  const [docId, setDocId] = useState<string | undefined>(id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (id) {
        const loaded = await loadDocument(id);
        if (loaded) {
          setForm(loaded);
          setDocId(id);
          if (localMode) {
            const doc = getLocalDocument(id);
            if (doc?.business_id) {
              const b = listBusinesses().find((x) => x.id === doc.business_id);
              if (b) {
                catalog.selectBusiness(b.id);
                setSeller(businessToSeller(b));
              }
            }
          }
        } else {
          toast.error("Document not found");
          navigate("/documents");
        }
      } else if (isNew) {
        setForm(createDefaultDocument(kind, settings));
        if (localMode) setSeller(catalog.seller);
      }
    };
    init();
  }, [id, kind, settings, isNew, loadDocument, navigate]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const onChange = useCallback((next: DocumentFormData) => {
    setForm(next);
    setDirty(true);
  }, []);

  const handleSelectBusiness = (businessId: string) => {
    catalog.selectBusiness(businessId);
    const b = catalog.businesses.find((x) => x.id === businessId);
    if (b) setSeller(businessToSeller(b));
    setDirty(true);
  };

  const handleAddBusiness = () => {
    const b = catalog.createBusiness("New Business");
    setSeller(businessToSeller(b));
    setDirty(true);
    toast.success("New business created — edit details below");
  };

  const handleSelectBuyer = (buyer: SavedBuyer) => {
    setForm((f) =>
      f
        ? {
            ...f,
            buyer_name: buyer.name,
            buyer_address: buyer.address,
            buyer_email: buyer.email,
          }
        : f,
    );
    setDirty(true);
  };

  const handleSelectNote = (note: SavedNotePreset) => {
    setForm((f) => (f ? { ...f, notes: note.text } : f));
    setDirty(true);
  };

  const handleSaveNote = (text: string) => {
    const saved = catalog.saveNote(text);
    if (saved) toast.success("Note saved");
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const businessId = localMode ? catalog.activeBusinessId : undefined;
      const saved = await saveDocument(form, docId, businessId);
      if (saved && "id" in saved) {
        if (localMode) {
          catalog.recordFromDocument(form, seller);
        }
        setDocId(saved.id as string);
        setForm((f) => (f ? { ...f, number: (saved as { number: string }).number } : f));
        setDirty(false);
        toast.success("Document saved");
        if (isNew) navigate(`/documents/${saved.id}`, { replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePdf = async () => {
    if (!form) return;
    const totals = calculateTotals(form.line_items);
    try {
      await downloadPdf(
        form.template_id,
        {
          ...form,
          ...seller,
          totals,
          amount_paid: form.amount_paid ?? totals.grand_total,
        },
        buildPdfFilename(form.number, form.issue_date),
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF failed");
    }
  };

  const displaySeller = localMode ? seller : cloudSeller;

  if (!form) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold">
          {isNew ? `New ${kind}` : `Edit ${form.number || "document"}`}
        </h1>
        <div className="flex gap-2 no-print">
          {dirty && (
            <span className="text-xs text-amber-600 self-center">Unsaved changes</span>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Print
          </button>
          <button
            onClick={handlePdf}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Download PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 no-print">
          <DocumentEditor
            form={form}
            seller={displaySeller}
            onChange={onChange}
            localMode={localMode}
            businesses={localMode ? catalog.businesses : undefined}
            activeBusinessId={localMode ? catalog.activeBusinessId : undefined}
            onSelectBusiness={localMode ? handleSelectBusiness : undefined}
            onAddBusiness={localMode ? handleAddBusiness : undefined}
            onSellerChange={localMode ? setSeller : undefined}
            buyers={localMode ? catalog.buyers : undefined}
            onSelectBuyer={localMode ? handleSelectBuyer : undefined}
            lineItemPresets={localMode ? catalog.lineItemPresets : undefined}
            notePresets={localMode ? catalog.notePresets : undefined}
            onSelectNote={localMode ? handleSelectNote : undefined}
            onSaveNote={localMode ? handleSaveNote : undefined}
            nextNumberPreview={
              !form.number
                ? localMode
                  ? previewBusinessDocumentNumber(
                      catalog.businesses.find(
                        (b) => b.id === catalog.activeBusinessId,
                      ) ?? catalog.activeBusiness,
                      form.kind,
                    )
                  : previewDocumentNumber(settings, form.kind)
                : undefined
            }
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <HtmlPreview
            form={form}
            seller={displaySeller}
          />
        </div>
      </div>
    </div>
  );
}
