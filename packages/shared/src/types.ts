export type DocumentKind = "proforma" | "invoice" | "receipt";

export type PaymentMethod = "cash" | "card" | "transfer" | "check" | "other";

export type TemplateId = "classic" | "minimal" | "modern";

export type DocumentImportSource = "ledger";

export interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate_percent: number;
  discount_percent: number;
  period_month?: number;
  period_year?: number;
}

export interface Totals {
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
}

export interface DocumentFormData {
  kind: DocumentKind;
  number: string;
  issue_date: string;
  currency: string;
  notes: string;
  template_id: TemplateId;
  buyer_name: string;
  buyer_address: string;
  buyer_email: string;
  valid_until?: string;
  due_date?: string;
  payment_terms?: string;
  show_due_info?: boolean;
  paid_at?: string;
  payment_method?: PaymentMethod;
  amount_paid?: number;
  source_document_id?: string;
  import_source?: DocumentImportSource | null;
  line_items: LineItemInput[];
}

export const DOCUMENT_TITLES: Record<DocumentKind, string> = {
  proforma: "PROFORMA INVOICE",
  invoice: "INVOICE",
  receipt: "RECEIPT",
};

export const KIND_LABELS: Record<DocumentKind, string> = {
  proforma: "Proforma Invoice",
  invoice: "Invoice",
  receipt: "Receipt",
};
