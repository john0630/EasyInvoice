import { toast } from "sonner";
import {
  applySnapshotToBrowserStorage,
  browserHasLocalData,
  isSnapshotEmpty,
  isValidSnapshot,
  normalizeSnapshot,
  snapshotFromBrowserStorage,
  type LocalDataSnapshot,
} from "./localDataTypes";

export type HydrateResult =
  | { mode: "file" }
  | { mode: "browser"; error?: string };

let fileBackendActive = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight: Promise<void> | null = null;
let hydrateDone = false;

export function isFileBackendActive(): boolean {
  return fileBackendActive;
}

export function isLocalDataHydrated(): boolean {
  return hydrateDone;
}

async function putSnapshot(snapshot: LocalDataSnapshot): Promise<LocalDataSnapshot> {
  const res = await fetch("/api/local-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeSnapshot(snapshot)),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to save local data (${res.status})`);
  }
  const saved = (await res.json()) as unknown;
  if (!isValidSnapshot(saved)) {
    throw new Error("Invalid response from local data API");
  }
  return saved;
}

export async function persistLocalSnapshotNow(): Promise<void> {
  if (!fileBackendActive) return;
  const snapshot = snapshotFromBrowserStorage((key) => localStorage.getItem(key));
  snapshot.meta.localStorageImported = true;
  await putSnapshot(snapshot);
}

export function schedulePersist(): void {
  if (!fileBackendActive) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const run = async () => {
      try {
        await persistLocalSnapshotNow();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Could not save data files: ${message}`);
      }
    };
    persistInFlight = (persistInFlight ?? Promise.resolve())
      .then(run, run)
      .finally(() => {
        persistInFlight = null;
      });
  }, 150);
}

export async function hydrateLocalData(): Promise<HydrateResult> {
  try {
    const res = await fetch("/api/local-data");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      fileBackendActive = false;
      hydrateDone = true;
      if (res.status >= 500) {
        return {
          mode: "browser",
          error: body.error ?? "Failed to read local data files",
        };
      }
      return { mode: "browser" };
    }

    const data = (await res.json()) as unknown;
    if (!isValidSnapshot(data)) {
      fileBackendActive = false;
      hydrateDone = true;
      return { mode: "browser", error: "Local data API returned an invalid snapshot" };
    }

    fileBackendActive = true;

    const hasBrowser = browserHasLocalData((key) => localStorage.getItem(key));

    if (isSnapshotEmpty(data) && !data.meta.localStorageImported && hasBrowser) {
      const migrated = snapshotFromBrowserStorage((key) =>
        localStorage.getItem(key),
      );
      migrated.meta.localStorageImported = true;
      const saved = await putSnapshot(migrated);
      applySnapshotToBrowserStorage(
        saved,
        (key, value) => localStorage.setItem(key, value),
        (key) => localStorage.removeItem(key),
      );
      hydrateDone = true;
      return { mode: "file" };
    }

    if (!isSnapshotEmpty(data) || data.meta.localStorageImported) {
      applySnapshotToBrowserStorage(
        data,
        (key, value) => localStorage.setItem(key, value),
        (key) => localStorage.removeItem(key),
      );
    }

    hydrateDone = true;
    return { mode: "file" };
  } catch {
    fileBackendActive = false;
    hydrateDone = true;
    return { mode: "browser" };
  }
}
