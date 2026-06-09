import type { DocumentKind } from "@easy-invoice/shared";
import type { OrganizationSettings } from "./supabase";

export const DEFAULT_CURRENCY = "MYR";

export const CURRENCIES = ["MYR", "USD", "SGD", "EUR", "GBP", "AUD", "CAD", "CNY", "JPY", "THB", "IDR"] as const;

const LOCAL_SETTINGS_KEY = "easy-invoice-org-settings";

export const defaultLocalSettings: OrganizationSettings = {
  organization_id: "local",
  currency: DEFAULT_CURRENCY,
  invoice_prefix: "INV",
  proforma_prefix: "PRO",
  receipt_prefix: "RCP",
  next_invoice_number: 1,
  next_proforma_number: 1,
  next_receipt_number: 1,
  default_tax_rate: 0,
  seller_name: "My Business",
  seller_address: "",
  seller_email: "",
  seller_phone: "",
  seller_tax_id: "",
  logo_path: null,
};

export function loadLocalSettings(): OrganizationSettings {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    return raw
      ? { ...defaultLocalSettings, ...JSON.parse(raw) }
      : { ...defaultLocalSettings };
  } catch {
    return { ...defaultLocalSettings };
  }
}

export function saveLocalSettings(settings: OrganizationSettings) {
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function formatDocumentNumber(prefix: string, seq: number): string {
  const clean = prefix.trim() || "DOC";
  return `${clean}-${String(seq).padStart(4, "0")}`;
}

function prefixAndCounter(
  settings: OrganizationSettings,
  kind: DocumentKind,
): { prefix: string; counterKey: keyof OrganizationSettings; next: number } {
  if (kind === "invoice") {
    return {
      prefix: settings.invoice_prefix,
      counterKey: "next_invoice_number",
      next: settings.next_invoice_number,
    };
  }
  if (kind === "proforma") {
    return {
      prefix: settings.proforma_prefix,
      counterKey: "next_proforma_number",
      next: settings.next_proforma_number,
    };
  }
  return {
    prefix: settings.receipt_prefix,
    counterKey: "next_receipt_number",
    next: settings.next_receipt_number,
  };
}

export function previewDocumentNumber(
  settings: OrganizationSettings | null | undefined,
  kind: DocumentKind,
): string {
  if (!settings) return "";
  const { prefix, next } = prefixAndCounter(settings, kind);
  return formatDocumentNumber(prefix, next);
}

export function assignLocalDocumentNumber(
  settings: OrganizationSettings,
  kind: DocumentKind,
): { number: string; settings: OrganizationSettings } {
  const { prefix, counterKey, next } = prefixAndCounter(settings, kind);
  const number = formatDocumentNumber(prefix, next);
  return {
    number,
    settings: {
      ...settings,
      [counterKey]: next + 1,
    } as OrganizationSettings,
  };
}
