import type {
  DocumentKind,
  LineItemInput,
  PaymentMethod,
  TemplateId,
  Totals,
} from "@easy-invoice/shared";

export interface PdfDocumentData {
  kind: DocumentKind;
  number: string;
  issue_date: string;
  currency: string;
  notes: string;
  template_id: TemplateId;
  seller_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  seller_tax_id: string;
  buyer_name: string;
  buyer_address: string;
  buyer_email: string;
  valid_until?: string;
  due_date?: string;
  payment_terms?: string;
  paid_at?: string;
  payment_method?: PaymentMethod;
  amount_paid?: number;
  line_items: LineItemInput[];
  totals: Totals;
}
