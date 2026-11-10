import { describe, expect, it } from "vitest";
import {
  BROWSER_KEYS,
  applySnapshotToBrowserStorage,
  browserHasLocalData,
  emptySnapshot,
  isSnapshotEmpty,
  isValidSnapshot,
  normalizeSnapshot,
  snapshotFromBrowserStorage,
} from "./localDataTypes";

describe("emptySnapshot / isSnapshotEmpty", () => {
  it("creates an empty snapshot", () => {
    const snap = emptySnapshot("2026-11-10T00:00:00.000Z");
    expect(isSnapshotEmpty(snap)).toBe(true);
    expect(snap.meta.localStorageImported).toBe(false);
    expect(snap.meta.updatedAt).toBe("2026-11-10T00:00:00.000Z");
  });

  it("is not empty when documents exist", () => {
    const snap = emptySnapshot();
    snap.documents.push({ id: "1" });
    expect(isSnapshotEmpty(snap)).toBe(false);
  });

  it("is not empty when settings exist", () => {
    const snap = emptySnapshot();
    snap.settings = { currency: "MYR" };
    expect(isSnapshotEmpty(snap)).toBe(false);
  });
});

describe("isValidSnapshot", () => {
  it("accepts a well-formed snapshot", () => {
    expect(isValidSnapshot(emptySnapshot())).toBe(true);
  });

  it("rejects missing arrays", () => {
    const snap = emptySnapshot() as unknown as Record<string, unknown>;
    delete snap.documents;
    expect(isValidSnapshot(snap)).toBe(false);
  });

  it("rejects bad meta", () => {
    const snap = emptySnapshot();
    (snap.meta as { localStorageImported: unknown }).localStorageImported =
      "yes";
    expect(isValidSnapshot(snap)).toBe(false);
  });
});

describe("browser mapping", () => {
  it("detects browser local data", () => {
    const store: Record<string, string> = {
      [BROWSER_KEYS.documents]: "[]",
    };
    expect(browserHasLocalData((k) => store[k] ?? null)).toBe(true);
    expect(browserHasLocalData(() => null)).toBe(false);
  });

  it("round-trips snapshot through browser storage", () => {
    const store: Record<string, string> = {};
    const original = emptySnapshot("2026-11-10T00:00:00.000Z");
    original.documents = [{ id: "doc-1" }];
    original.businesses = [{ id: "biz-1", name: "Acme" }];
    original.activeBusinessId = "biz-1";
    original.meta.activeBusinessId = "biz-1";
    original.buyers = [{ id: "buyer-1" }];
    original.lineItems = [{ id: "li-1" }];
    original.notes = [{ id: "n-1" }];
    original.settings = { currency: "MYR" };

    applySnapshotToBrowserStorage(
      original,
      (k, v) => {
        store[k] = v;
      },
      (k) => {
        delete store[k];
      },
    );

    const restored = snapshotFromBrowserStorage(
      (k) => store[k] ?? null,
      "2026-11-10T01:00:00.000Z",
    );

    expect(restored.documents).toEqual(original.documents);
    expect(restored.businesses).toEqual(original.businesses);
    expect(restored.activeBusinessId).toBe("biz-1");
    expect(restored.buyers).toEqual(original.buyers);
    expect(restored.lineItems).toEqual(original.lineItems);
    expect(restored.notes).toEqual(original.notes);
    expect(restored.settings).toEqual(original.settings);
    expect(restored.meta.localStorageImported).toBe(true);
  });
});

describe("normalizeSnapshot", () => {
  it("keeps root and meta activeBusinessId in sync", () => {
    const snap = emptySnapshot();
    snap.activeBusinessId = "biz-9";
    snap.meta.activeBusinessId = null;
    const normalized = normalizeSnapshot(snap, "2026-11-10T02:00:00.000Z");
    expect(normalized.activeBusinessId).toBe("biz-9");
    expect(normalized.meta.activeBusinessId).toBe("biz-9");
    expect(normalized.meta.updatedAt).toBe("2026-11-10T02:00:00.000Z");
  });
});
