export type LocalDataMeta = {
  activeBusinessId: string | null;
  localStorageImported: boolean;
  updatedAt: string;
};

export type LocalDataSnapshot = {
  documents: unknown[];
  businesses: unknown[];
  activeBusinessId: string | null;
  buyers: unknown[];
  lineItems: unknown[];
  notes: unknown[];
  settings: unknown | null;
  meta: LocalDataMeta;
};

export const BROWSER_KEYS = {
  documents: "easy-invoice-local-docs",
  businesses: "easy-invoice-local-businesses",
  activeBusinessId: "easy-invoice-local-active-business-id",
  buyers: "easy-invoice-local-buyers",
  lineItems: "easy-invoice-local-line-items",
  notes: "easy-invoice-local-notes",
  settings: "easy-invoice-org-settings",
} as const;

export function emptySnapshot(now = new Date().toISOString()): LocalDataSnapshot {
  return {
    documents: [],
    businesses: [],
    activeBusinessId: null,
    buyers: [],
    lineItems: [],
    notes: [],
    settings: null,
    meta: {
      activeBusinessId: null,
      localStorageImported: false,
      updatedAt: now,
    },
  };
}

export function isSnapshotEmpty(snapshot: LocalDataSnapshot): boolean {
  return (
    snapshot.documents.length === 0 &&
    snapshot.businesses.length === 0 &&
    snapshot.buyers.length === 0 &&
    snapshot.lineItems.length === 0 &&
    snapshot.notes.length === 0 &&
    snapshot.settings == null
  );
}

export function isValidSnapshot(value: unknown): value is LocalDataSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.documents)) return false;
  if (!Array.isArray(v.businesses)) return false;
  if (!Array.isArray(v.buyers)) return false;
  if (!Array.isArray(v.lineItems)) return false;
  if (!Array.isArray(v.notes)) return false;
  if (!(v.settings === null || typeof v.settings === "object")) return false;
  if (!(v.activeBusinessId === null || typeof v.activeBusinessId === "string")) {
    return false;
  }
  if (!v.meta || typeof v.meta !== "object") return false;
  const meta = v.meta as Record<string, unknown>;
  if (
    !(
      meta.activeBusinessId === null ||
      typeof meta.activeBusinessId === "string"
    )
  ) {
    return false;
  }
  if (typeof meta.localStorageImported !== "boolean") return false;
  if (typeof meta.updatedAt !== "string") return false;
  return true;
}

function parseJsonUnknown(raw: string | null): unknown {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function browserHasLocalData(
  getItem: (key: string) => string | null,
): boolean {
  return Object.values(BROWSER_KEYS).some((key) => {
    const raw = getItem(key);
    return raw != null && raw !== "";
  });
}

export function snapshotFromBrowserStorage(
  getItem: (key: string) => string | null,
  now = new Date().toISOString(),
): LocalDataSnapshot {
  const documents = parseJsonUnknown(getItem(BROWSER_KEYS.documents));
  const businesses = parseJsonUnknown(getItem(BROWSER_KEYS.businesses));
  const buyers = parseJsonUnknown(getItem(BROWSER_KEYS.buyers));
  const lineItems = parseJsonUnknown(getItem(BROWSER_KEYS.lineItems));
  const notes = parseJsonUnknown(getItem(BROWSER_KEYS.notes));
  const settings = parseJsonUnknown(getItem(BROWSER_KEYS.settings));
  const activeRaw = getItem(BROWSER_KEYS.activeBusinessId);
  const activeBusinessId =
    activeRaw && activeRaw.trim() !== "" ? activeRaw : null;

  return {
    documents: Array.isArray(documents) ? documents : [],
    businesses: Array.isArray(businesses) ? businesses : [],
    activeBusinessId,
    buyers: Array.isArray(buyers) ? buyers : [],
    lineItems: Array.isArray(lineItems) ? lineItems : [],
    notes: Array.isArray(notes) ? notes : [],
    settings:
      settings && typeof settings === "object" ? settings : null,
    meta: {
      activeBusinessId,
      localStorageImported: true,
      updatedAt: now,
    },
  };
}

export function applySnapshotToBrowserStorage(
  snapshot: LocalDataSnapshot,
  setItem: (key: string, value: string) => void,
  removeItem?: (key: string) => void,
): void {
  setItem(BROWSER_KEYS.documents, JSON.stringify(snapshot.documents));
  setItem(BROWSER_KEYS.businesses, JSON.stringify(snapshot.businesses));
  setItem(BROWSER_KEYS.buyers, JSON.stringify(snapshot.buyers));
  setItem(BROWSER_KEYS.lineItems, JSON.stringify(snapshot.lineItems));
  setItem(BROWSER_KEYS.notes, JSON.stringify(snapshot.notes));

  const activeId = snapshot.activeBusinessId ?? snapshot.meta.activeBusinessId;
  if (activeId) {
    setItem(BROWSER_KEYS.activeBusinessId, activeId);
  } else if (removeItem) {
    removeItem(BROWSER_KEYS.activeBusinessId);
  }

  if (snapshot.settings == null) {
    if (removeItem) removeItem(BROWSER_KEYS.settings);
  } else {
    setItem(BROWSER_KEYS.settings, JSON.stringify(snapshot.settings));
  }
}

export function normalizeSnapshot(
  snapshot: LocalDataSnapshot,
  now = new Date().toISOString(),
): LocalDataSnapshot {
  const activeBusinessId =
    snapshot.activeBusinessId ?? snapshot.meta.activeBusinessId ?? null;
  return {
    ...snapshot,
    activeBusinessId,
    meta: {
      ...snapshot.meta,
      activeBusinessId,
      updatedAt: now,
    },
  };
}
