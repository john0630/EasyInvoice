import type { DocumentFormData, DocumentKind } from "@easy-invoice/shared";
import { previousMonthPeriod } from "@easy-invoice/shared";
import type { OrganizationSettings } from "./supabase";
import { DEFAULT_CURRENCY } from "./localSettings";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultLineItem(taxRate = 0) {
  const { period_month, period_year } = previousMonthPeriod();
  return {
    description: "",
    quantity: 1,
    unit_price: 0,
    tax_rate_percent: taxRate,
    discount_percent: 0,
    period_month,
    period_year,
  };
}

export function createDefaultDocument(
  kind: DocumentKind,
  settings?: OrganizationSettings | null,
): DocumentFormData {
  const currency = settings?.currency ?? DEFAULT_CURRENCY;
  const tax = settings?.default_tax_rate ?? 0;

  const base: DocumentFormData = {
    kind,
    number: "",
    issue_date: today(),
    currency,
    notes: "",
    template_id: "classic",
    buyer_name: "",
    buyer_address: "",
    buyer_email: "",
    line_items: [defaultLineItem(tax)],
  };

  if (kind === "invoice") {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    return {
      ...base,
      show_due_info: false,
      due_date: due.toISOString().slice(0, 10),
      payment_terms: "Net 30",
    };
  }

  if (kind === "proforma") {
    const valid = new Date();
    valid.setDate(valid.getDate() + 14);
    return { ...base, valid_until: valid.toISOString().slice(0, 10) };
  }

  return {
    ...base,
    paid_at: new Date().toISOString(),
    payment_method: "transfer",
    amount_paid: 0,
  };
}

export function sellerFromSettings(settings?: OrganizationSettings | null) {
  return {
    seller_name: settings?.seller_name ?? "",
    seller_address: settings?.seller_address ?? "",
    seller_email: settings?.seller_email ?? "",
    seller_phone: settings?.seller_phone ?? "",
    seller_tax_id: settings?.seller_tax_id ?? "",
    logo_path: settings?.logo_path ?? null,
  };
}
