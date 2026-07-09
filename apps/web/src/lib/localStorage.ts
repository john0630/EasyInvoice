import type { DocumentFormData } from "@easy-invoice/shared";
import { calculateTotals } from "@easy-invoice/shared";
import type { DbDocument, DbLineItem } from "./supabase";
import {
  assignLocalDocumentNumber,
  loadLocalSettings,
  saveLocalSettings,
} from "./localSettings";
import {
  assignBusinessDocumentNumber,
  getBusinessById,
  upsertBusiness,
} from "./localCatalog";

const STORAGE_KEY = "easy-invoice-local-docs";

export type LocalDocument = DbDocument & {
  line_items: DbLineItem[];
  business_id?: string;
  show_due_info?: boolean | null;
};

function loadAll(): LocalDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalDocument[]) : [];
  } catch {
    return [];
  }
}

function saveAll(docs: LocalDocument[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function listLocalDocuments(): LocalDocument[] {
  return loadAll().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function getLocalDocument(id: string): LocalDocument | null {
  return loadAll().find((d) => d.id === id) ?? null;
}

export function saveLocalDocument(
  form: DocumentFormData,
  _seller?: {
    seller_name: string;
    seller_address: string;
    seller_email: string;
    seller_phone: string;
    seller_tax_id: string;
  },
  id?: string,
  businessId?: string,
): LocalDocument {
  const totals = calculateTotals(form.line_items);
  const now = new Date().toISOString();
  const all = loadAll();

  let number = form.number.trim();

  if (!number && !id) {
    if (businessId) {
      const business = getBusinessById(businessId);
      if (business) {
        const assigned = assignBusinessDocumentNumber(business, form.kind);
        number = assigned.number;
        upsertBusiness(assigned.business);
      }
    }
    if (!number) {
      const assigned = assignLocalDocumentNumber(loadLocalSettings(), form.kind);
      number = assigned.number;
      saveLocalSettings(assigned.settings);
    }
  } else if (!number && id) {
    const existing = all.find((d) => d.id === id);
    number = existing?.number ?? "";
  }

  const doc: LocalDocument = {
    id: id ?? crypto.randomUUID(),
    organization_id: "local",
    kind: form.kind,
    number,
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
    show_due_info:
      form.kind === "invoice" ? (form.show_due_info ?? false) : null,
    paid_at: form.paid_at ?? null,
    payment_method: form.payment_method ?? null,
    amount_paid: form.amount_paid ?? null,
    source_document_id: form.source_document_id ?? null,
    import_source: form.import_source ?? null,
    subtotal: totals.subtotal,
    tax_total: totals.tax_total,
    discount_total: totals.discount_total,
    grand_total: totals.grand_total,
    created_by: null,
    created_at: id ? (all.find((d) => d.id === id)?.created_at ?? now) : now,
    updated_at: now,
    business_id: businessId,
    line_items: form.line_items.map((item, i) => ({
      id: crypto.randomUUID(),
      document_id: id ?? "",
      sort_order: i,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate_percent: item.tax_rate_percent,
      discount_percent: item.discount_percent,
      period_month: item.period_month ?? null,
      period_year: item.period_year ?? null,
    })),
  };

  doc.line_items.forEach((li) => {
    li.document_id = doc.id;
  });

  const idx = all.findIndex((d) => d.id === doc.id);
  if (idx >= 0) all[idx] = doc;
  else all.push(doc);
  saveAll(all);
  return doc;
}

export function deleteLocalDocument(id: string) {
  saveAll(loadAll().filter((d) => d.id !== id));
}

export function deleteLocalDocuments(ids: string[]) {
  const remove = new Set(ids);
  saveAll(loadAll().filter((d) => !remove.has(d.id)));
}

export function formFromLocal(doc: LocalDocument): DocumentFormData {
  const form: DocumentFormData = {
    kind: doc.kind,
    number: doc.number,
    issue_date: doc.issue_date,
    currency: doc.currency,
    notes: doc.notes,
    template_id: doc.template_id as DocumentFormData["template_id"],
    buyer_name: doc.buyer_name,
    buyer_address: doc.buyer_address,
    buyer_email: doc.buyer_email,
    valid_until: doc.valid_until ?? undefined,
    due_date: doc.due_date ?? undefined,
    payment_terms: doc.payment_terms ?? undefined,
    paid_at: doc.paid_at ?? undefined,
    payment_method: (doc.payment_method as DocumentFormData["payment_method"]) ?? undefined,
    amount_paid: doc.amount_paid ?? undefined,
    source_document_id: doc.source_document_id ?? undefined,
    import_source: (doc.import_source as DocumentFormData["import_source"]) ?? undefined,
    line_items: doc.line_items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(
        ({
          description,
          quantity,
          unit_price,
          tax_rate_percent,
          discount_percent,
          period_month,
          period_year,
        }) => ({
          description,
          quantity: Number(quantity),
          unit_price: Number(unit_price),
          tax_rate_percent: Number(tax_rate_percent),
          discount_percent: Number(discount_percent),
          period_month: period_month ?? undefined,
          period_year: period_year ?? undefined,
        }),
      ),
  };

  if (doc.kind === "invoice") {
    form.show_due_info = doc.show_due_info ?? doc.due_date != null;
  }

  return form;
}
