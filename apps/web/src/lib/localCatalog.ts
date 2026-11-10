import type { DocumentFormData, DocumentKind, LineItemInput } from "@easy-invoice/shared";
import { hasNotesContent, notesToPlainText, previousMonthPeriod } from "@easy-invoice/shared";
import {
  assignDocumentNumber,
  defaultDocumentNumbering,
  loadLocalSettings,
  previewDocumentNumber,
  type DocumentNumbering,
} from "./localSettings";
import { schedulePersist } from "./localDataSync";

const BUSINESSES_KEY = "easy-invoice-local-businesses";
const ACTIVE_BUSINESS_KEY = "easy-invoice-local-active-business-id";
const BUYERS_KEY = "easy-invoice-local-buyers";
const LINE_ITEMS_KEY = "easy-invoice-local-line-items";
const NOTES_KEY = "easy-invoice-local-notes";
const LEGACY_SETTINGS_KEY = "easy-invoice-org-settings";

export type SavedBusiness = {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  tax_id: string;
} & DocumentNumbering;

export function suggestBusinessInvoicePrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return defaultDocumentNumbering.invoice_prefix;
  if (words.length === 1) {
    const token = words[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return token.slice(0, 4) || defaultDocumentNumbering.invoice_prefix;
  }
  const initials = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "")[0] ?? "")
    .join("")
    .toUpperCase();
  return initials.slice(0, 4) || defaultDocumentNumbering.invoice_prefix;
}

function defaultBusinessNumbering(name = ""): DocumentNumbering {
  const invoicePrefix = suggestBusinessInvoicePrefix(name);
  return {
    invoice_prefix: invoicePrefix,
    proforma_prefix: `${invoicePrefix}P`,
    receipt_prefix: `${invoicePrefix}R`,
    next_invoice_number: 1,
    next_proforma_number: 1,
    next_receipt_number: 1,
  };
}

export function normalizeBusiness(
  business: Partial<SavedBusiness> & Pick<SavedBusiness, "id">,
): SavedBusiness {
  const invoicePrefix =
    business.invoice_prefix?.trim() ||
    suggestBusinessInvoicePrefix(business.name ?? "");
  const numberingDefaults = defaultBusinessNumbering(business.name ?? "");
  return {
    id: business.id,
    name: business.name ?? "",
    address: business.address ?? "",
    email: business.email ?? "",
    phone: business.phone ?? "",
    tax_id: business.tax_id ?? "",
    invoice_prefix: invoicePrefix,
    proforma_prefix:
      business.proforma_prefix?.trim() ||
      numberingDefaults.proforma_prefix,
    receipt_prefix:
      business.receipt_prefix?.trim() ||
      numberingDefaults.receipt_prefix,
    next_invoice_number: business.next_invoice_number ?? 1,
    next_proforma_number: business.next_proforma_number ?? 1,
    next_receipt_number: business.next_receipt_number ?? 1,
  };
}

export function getBusinessById(id: string): SavedBusiness | null {
  return listBusinesses().find((b) => b.id === id) ?? null;
}

export function assignBusinessDocumentNumber(
  business: SavedBusiness,
  kind: DocumentKind,
): { number: string; business: SavedBusiness } {
  const assigned = assignDocumentNumber(business, kind);
  return { number: assigned.number, business: assigned.settings };
}

export function previewBusinessDocumentNumber(
  business: SavedBusiness | null | undefined,
  kind: DocumentKind,
): string {
  return previewDocumentNumber(business, kind);
}

export type SavedBuyer = {
  id: string;
  name: string;
  address: string;
  email: string;
};

export type SavedLineItemPreset = {
  id: string;
  description: string;
  unit_price: number;
  tax_rate_percent: number;
};

export type SavedNotePreset = {
  id: string;
  text: string;
};

export type SellerInfo = {
  seller_name: string;
  seller_address: string;
  seller_email: string;
  seller_phone: string;
  seller_tax_id: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  schedulePersist();
}

function migrateLegacyBusiness(): SavedBusiness[] {
  const legacy = readJson<Record<string, string> | null>(LEGACY_SETTINGS_KEY, null);
  if (!legacy?.seller_name && !legacy?.seller_address) {
    return [normalizeBusiness({ id: crypto.randomUUID(), name: "My Business" })];
  }
  return [
    normalizeBusiness({
      id: crypto.randomUUID(),
      name: legacy.seller_name || "My Business",
      address: legacy.seller_address || "",
      email: legacy.seller_email || "",
      phone: legacy.seller_phone || "",
      tax_id: legacy.seller_tax_id || "",
    }),
  ];
}

export function listBusinesses(): SavedBusiness[] {
  let businesses = readJson<SavedBusiness[]>(BUSINESSES_KEY, []);
  if (businesses.length === 0) {
    businesses = migrateLegacyBusiness();
    writeJson(BUSINESSES_KEY, businesses);
    writeJson(ACTIVE_BUSINESS_KEY, businesses[0].id);
  } else {
    const org = loadLocalSettings();
    const normalized = businesses.map((b, index) => {
      const isLegacy = b.invoice_prefix === undefined;
      if (isLegacy && index === 0) {
        return normalizeBusiness({
          ...b,
          invoice_prefix: org.invoice_prefix,
          proforma_prefix: org.proforma_prefix,
          receipt_prefix: org.receipt_prefix,
          next_invoice_number: org.next_invoice_number,
          next_proforma_number: org.next_proforma_number,
          next_receipt_number: org.next_receipt_number,
        });
      }
      return normalizeBusiness(b);
    });
    const changed = normalized.some(
      (b, i) => JSON.stringify(b) !== JSON.stringify(businesses[i]),
    );
    if (changed) {
      businesses = normalized;
      writeJson(BUSINESSES_KEY, businesses);
    }
  }
  return businesses;
}

export function getActiveBusinessId(): string {
  const businesses = listBusinesses();
  const id = localStorage.getItem(ACTIVE_BUSINESS_KEY);
  if (id && businesses.some((b) => b.id === id)) return id;
  return businesses[0]?.id ?? "";
}

export function setActiveBusinessId(id: string) {
  localStorage.setItem(ACTIVE_BUSINESS_KEY, id);
  schedulePersist();
}

export function getActiveBusiness(): SavedBusiness | null {
  const id = getActiveBusinessId();
  return listBusinesses().find((b) => b.id === id) ?? null;
}

export function businessToSeller(b: SavedBusiness | null): SellerInfo {
  if (!b) {
    return {
      seller_name: "",
      seller_address: "",
      seller_email: "",
      seller_phone: "",
      seller_tax_id: "",
    };
  }
  return {
    seller_name: b.name,
    seller_address: b.address,
    seller_email: b.email,
    seller_phone: b.phone,
    seller_tax_id: b.tax_id,
  };
}

export function sellerToBusiness(seller: SellerInfo, id?: string): SavedBusiness {
  return normalizeBusiness({
    id: id ?? crypto.randomUUID(),
    name: seller.seller_name,
    address: seller.seller_address,
    email: seller.seller_email,
    phone: seller.seller_phone,
    tax_id: seller.seller_tax_id,
  });
}

export function upsertBusiness(business: SavedBusiness): SavedBusiness {
  const saved = normalizeBusiness(business);
  const all = listBusinesses();
  const idx = all.findIndex((b) => b.id === saved.id);
  if (idx >= 0) all[idx] = saved;
  else all.push(saved);
  writeJson(BUSINESSES_KEY, all);
  return saved;
}

export function addBusiness(name = "New Business"): SavedBusiness {
  const business = normalizeBusiness({
    id: crypto.randomUUID(),
    name,
    address: "",
    email: "",
    phone: "",
    tax_id: "",
    ...defaultBusinessNumbering(name),
  });
  upsertBusiness(business);
  setActiveBusinessId(business.id);
  return business;
}

export function deleteBusiness(id: string) {
  const all = listBusinesses().filter((b) => b.id !== id);
  if (all.length === 0) {
    addBusiness("My Business");
    return;
  }
  writeJson(BUSINESSES_KEY, all);
  if (getActiveBusinessId() === id) {
    setActiveBusinessId(all[0].id);
  }
}

export function listBuyers(): SavedBuyer[] {
  return readJson<SavedBuyer[]>(BUYERS_KEY, []);
}

function buyerKey(b: Pick<SavedBuyer, "name" | "email">) {
  return `${b.name.trim().toLowerCase()}|${b.email.trim().toLowerCase()}`;
}

export function upsertBuyer(buyer: Omit<SavedBuyer, "id"> & { id?: string }): SavedBuyer {
  if (!buyer.name.trim()) {
    throw new Error("Buyer name is required");
  }
  const all = listBuyers();
  const key = buyerKey(buyer);
  const existing = all.find((b) => buyerKey(b) === key);
  const saved: SavedBuyer = existing
    ? { ...existing, ...buyer, id: existing.id }
    : { id: buyer.id ?? crypto.randomUUID(), ...buyer };
  const idx = all.findIndex((b) => b.id === saved.id);
  if (idx >= 0) all[idx] = saved;
  else all.push(saved);
  writeJson(BUYERS_KEY, all.sort((a, b) => a.name.localeCompare(b.name)));
  return saved;
}

export function deleteBuyer(id: string) {
  writeJson(
    BUYERS_KEY,
    listBuyers().filter((b) => b.id !== id),
  );
}

export function listLineItemPresets(): SavedLineItemPreset[] {
  return readJson<SavedLineItemPreset[]>(LINE_ITEMS_KEY, []);
}

export function upsertLineItemPreset(
  preset: Omit<SavedLineItemPreset, "id"> & { id?: string },
): SavedLineItemPreset | null {
  const desc = preset.description.trim();
  if (!desc) return null;
  const all = listLineItemPresets();

  if (preset.id) {
    const idx = all.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      const saved: SavedLineItemPreset = {
        id: preset.id,
        description: desc,
        unit_price: preset.unit_price,
        tax_rate_percent: preset.tax_rate_percent,
      };
      all[idx] = saved;
      writeJson(
        LINE_ITEMS_KEY,
        all.sort((a, b) => a.description.localeCompare(b.description)),
      );
      return saved;
    }
  }

  const existing = all.find(
    (p) => p.description.trim().toLowerCase() === desc.toLowerCase(),
  );
  const saved: SavedLineItemPreset = existing
    ? {
        ...existing,
        description: desc,
        unit_price: preset.unit_price,
        tax_rate_percent: preset.tax_rate_percent,
      }
    : {
        id: preset.id ?? crypto.randomUUID(),
        description: desc,
        unit_price: preset.unit_price,
        tax_rate_percent: preset.tax_rate_percent,
      };
  const idx = all.findIndex((p) => p.id === saved.id);
  if (idx >= 0) all[idx] = saved;
  else all.push(saved);
  writeJson(
    LINE_ITEMS_KEY,
    all.sort((a, b) => a.description.localeCompare(b.description)),
  );
  return saved;
}

export function deleteLineItemPreset(id: string) {
  writeJson(
    LINE_ITEMS_KEY,
    listLineItemPresets().filter((p) => p.id !== id),
  );
}

export function findLineItemPreset(description: string): SavedLineItemPreset | undefined {
  const key = description.trim().toLowerCase();
  return listLineItemPresets().find((p) => p.description.trim().toLowerCase() === key);
}

export function notePresetLabel(text: string, maxLength = 60): string {
  const line = notesToPlainText(text).trim().split("\n")[0] ?? "";
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength - 1)}…`;
}

export function listNotePresets(): SavedNotePreset[] {
  return readJson<SavedNotePreset[]>(NOTES_KEY, []);
}

export function upsertNotePreset(
  text: string,
  id?: string,
): SavedNotePreset | null {
  if (!hasNotesContent(text)) return null;
  const trimmed = text.trim();
  const all = listNotePresets();

  if (id) {
    const idx = all.findIndex((n) => n.id === id);
    if (idx >= 0) {
      const saved: SavedNotePreset = { id, text: trimmed };
      all[idx] = saved;
      writeJson(
        NOTES_KEY,
        all.sort((a, b) => notePresetLabel(a.text).localeCompare(notePresetLabel(b.text))),
      );
      return saved;
    }
  }

  const existing = all.find((n) => n.text.trim() === trimmed);
  const saved: SavedNotePreset = existing
    ? { ...existing, text: trimmed }
    : { id: id ?? crypto.randomUUID(), text: trimmed };
  const idx = all.findIndex((n) => n.id === saved.id);
  if (idx >= 0) all[idx] = saved;
  else all.push(saved);
  writeJson(
    NOTES_KEY,
    all.sort((a, b) => notePresetLabel(a.text).localeCompare(notePresetLabel(b.text))),
  );
  return saved;
}

export function deleteNotePreset(id: string) {
  writeJson(
    NOTES_KEY,
    listNotePresets().filter((n) => n.id !== id),
  );
}

export function recordDocumentCatalog(
  form: DocumentFormData,
  seller: SellerInfo,
  businessId: string,
) {
  const existing = getBusinessById(businessId);
  upsertBusiness(
    normalizeBusiness({
      ...(existing ?? { id: businessId, name: seller.seller_name }),
      id: businessId,
      name: seller.seller_name,
      address: seller.seller_address,
      email: seller.seller_email,
      phone: seller.seller_phone,
      tax_id: seller.seller_tax_id,
    }),
  );

  if (form.buyer_name.trim()) {
    upsertBuyer({
      name: form.buyer_name.trim(),
      address: form.buyer_address,
      email: form.buyer_email,
    });
  }

  for (const item of form.line_items) {
    upsertLineItemPreset({
      description: item.description,
      unit_price: item.unit_price,
      tax_rate_percent: item.tax_rate_percent,
    });
  }

  if (hasNotesContent(form.notes)) {
    upsertNotePreset(form.notes);
  }
}

export function applyLineItemPreset(
  item: LineItemInput,
  preset: SavedLineItemPreset,
): LineItemInput {
  const { period_month, period_year } = previousMonthPeriod();
  return {
    ...item,
    description: preset.description,
    unit_price: preset.unit_price,
    tax_rate_percent: preset.tax_rate_percent,
    period_month,
    period_year,
  };
}
