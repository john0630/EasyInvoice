import type { DocumentFormData, LineItemInput } from "@easy-invoice/shared";
import { hasNotesContent, notesToPlainText, previousMonthPeriod } from "@easy-invoice/shared";

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
};

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
}

function migrateLegacyBusiness(): SavedBusiness[] {
  const legacy = readJson<Record<string, string> | null>(LEGACY_SETTINGS_KEY, null);
  if (!legacy?.seller_name && !legacy?.seller_address) {
    return [
      {
        id: crypto.randomUUID(),
        name: "My Business",
        address: "",
        email: "",
        phone: "",
        tax_id: "",
      },
    ];
  }
  return [
    {
      id: crypto.randomUUID(),
      name: legacy.seller_name || "My Business",
      address: legacy.seller_address || "",
      email: legacy.seller_email || "",
      phone: legacy.seller_phone || "",
      tax_id: legacy.seller_tax_id || "",
    },
  ];
}

export function listBusinesses(): SavedBusiness[] {
  let businesses = readJson<SavedBusiness[]>(BUSINESSES_KEY, []);
  if (businesses.length === 0) {
    businesses = migrateLegacyBusiness();
    writeJson(BUSINESSES_KEY, businesses);
    writeJson(ACTIVE_BUSINESS_KEY, businesses[0].id);
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
  return {
    id: id ?? crypto.randomUUID(),
    name: seller.seller_name,
    address: seller.seller_address,
    email: seller.seller_email,
    phone: seller.seller_phone,
    tax_id: seller.seller_tax_id,
  };
}

export function upsertBusiness(business: SavedBusiness): SavedBusiness {
  const all = listBusinesses();
  const idx = all.findIndex((b) => b.id === business.id);
  if (idx >= 0) all[idx] = business;
  else all.push(business);
  writeJson(BUSINESSES_KEY, all);
  return business;
}

export function addBusiness(name = "New Business"): SavedBusiness {
  const business: SavedBusiness = {
    id: crypto.randomUUID(),
    name,
    address: "",
    email: "",
    phone: "",
    tax_id: "",
  };
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
  upsertBusiness({
    id: businessId,
    name: seller.seller_name,
    address: seller.seller_address,
    email: seller.seller_email,
    phone: seller.seller_phone,
    tax_id: seller.seller_tax_id,
  });

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
