import { useCallback } from "react";
import {
  calculateTotals,
  validateDocument,
  type DocumentFormData,
  type DocumentKind,
} from "@easy-invoice/shared";
import {
  isSupabaseConfigured,
  supabase,
  type DbLineItem,
} from "@/lib/supabase";
import {
  saveLocalDocument,
  getLocalDocument,
  formFromLocal,
  deleteLocalDocument,
  deleteLocalDocuments,
  listLocalDocuments,
  type LocalDocument,
} from "@/lib/localStorage";
import { sellerFromSettings } from "@/lib/documentDefaults";
import type { OrganizationSettings } from "@/lib/supabase";
import type { SellerInfo } from "@/lib/localCatalog";

export function useDocumentOps(
  orgId: string | null,
  settings: OrganizationSettings | null,
  localSeller?: SellerInfo,
) {
  const seller = localSeller ?? sellerFromSettings(settings);

  const loadDocument = useCallback(
    async (id: string): Promise<DocumentFormData | null> => {
      if (!isSupabaseConfigured || orgId === "local") {
        const doc = getLocalDocument(id);
        return doc ? formFromLocal(doc) : null;
      }

      const { data: doc, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !doc) return null;

      const { data: items } = await supabase
        .from("line_items")
        .select("*")
        .eq("document_id", id)
        .order("sort_order");

      return formFromLocal({
        ...(doc as LocalDocument),
        line_items: (items as DbLineItem[]) ?? [],
      });
    },
    [orgId],
  );

  const listDocuments = useCallback(
    async (kind?: DocumentKind) => {
      if (!isSupabaseConfigured || orgId === "local") {
        let docs = listLocalDocuments();
        if (kind) docs = docs.filter((d) => d.kind === kind);
        return docs;
      }

      let query = supabase
        .from("documents")
        .select("*")
        .eq("organization_id", orgId!)
        .order("updated_at", { ascending: false });

      if (kind) query = query.eq("kind", kind);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    [orgId],
  );

  const saveDocument = useCallback(
    async (form: DocumentFormData, documentId?: string, businessId?: string) => {
      const validation = validateDocument(form, form.kind);
      if (!validation.success) {
        const msg = validation.error.errors.map((e) => e.message).join(", ");
        throw new Error(msg);
      }

      const totals = calculateTotals(form.line_items);

      if (!isSupabaseConfigured || orgId === "local") {
        return saveLocalDocument(form, seller, documentId, businessId);
      }

      let number = form.number;
      if (!documentId && !number) {
        const { data: num, error: numErr } = await supabase.rpc(
          "assign_document_number",
          { p_org_id: orgId, p_kind: form.kind },
        );
        if (numErr) throw numErr;
        number = num as string;
      }

      const payload = {
        organization_id: orgId,
        kind: form.kind,
        number: number || form.number,
        issue_date: form.issue_date,
        currency: form.currency,
        notes: form.notes,
        template_id: form.template_id,
        buyer_name: form.buyer_name,
        buyer_address: form.buyer_address,
        buyer_email: form.buyer_email,
        valid_until: form.valid_until ?? null,
        due_date:
          form.kind === "invoice" && form.show_due_info !== true
            ? null
            : (form.due_date ?? null),
        payment_terms:
          form.kind === "invoice" && form.show_due_info !== true
            ? null
            : (form.payment_terms ?? null),
        paid_at: form.paid_at ?? null,
        payment_method: form.payment_method ?? null,
        amount_paid: form.amount_paid ?? totals.grand_total,
        source_document_id: form.source_document_id || null,
        import_source: form.import_source ?? null,
        subtotal: totals.subtotal,
        tax_total: totals.tax_total,
        discount_total: totals.discount_total,
        grand_total: totals.grand_total,
      };

      if (documentId) {
        const { error } = await supabase
          .from("documents")
          .update(payload)
          .eq("id", documentId);
        if (error) throw error;

        await supabase.from("line_items").delete().eq("document_id", documentId);
        await supabase.from("line_items").insert(
          form.line_items.map((item, i) => ({
            document_id: documentId,
            sort_order: i,
            ...item,
          })),
        );

        const { data } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .single();
        return data;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: doc, error } = await supabase
        .from("documents")
        .insert({ ...payload, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("line_items").insert(
        form.line_items.map((item, i) => ({
          document_id: doc.id,
          sort_order: i,
          ...item,
        })),
      );

      return doc;
    },
    [orgId, seller],
  );

  const removeDocument = useCallback(
    async (id: string) => {
      if (!isSupabaseConfigured || orgId === "local") {
        deleteLocalDocument(id);
        return;
      }
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    [orgId],
  );

  const removeDocuments = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      if (!isSupabaseConfigured || orgId === "local") {
        deleteLocalDocuments(ids);
        return;
      }
      const { error } = await supabase.from("documents").delete().in("id", ids);
      if (error) throw error;
    },
    [orgId],
  );

  const duplicateAs = useCallback(
    async (sourceId: string, targetKind: DocumentKind) => {
      const source = await loadDocument(sourceId);
      if (!source) throw new Error("Document not found");

      const duplicate: DocumentFormData = {
        ...source,
        kind: targetKind,
        number: "",
        source_document_id: sourceId,
      };

      if (targetKind === "receipt") {
        const totals = calculateTotals(source.line_items);
        duplicate.paid_at = new Date().toISOString();
        duplicate.payment_method = "transfer";
        duplicate.amount_paid = totals.grand_total;
      }

      const businessId =
        !isSupabaseConfigured || orgId === "local"
          ? getLocalDocument(sourceId)?.business_id
          : undefined;

      return saveDocument(duplicate, undefined, businessId);
    },
    [loadDocument, saveDocument, orgId],
  );

  return {
    loadDocument,
    listDocuments,
    saveDocument,
    removeDocument,
    removeDocuments,
    duplicateAs,
    seller,
  };
}
