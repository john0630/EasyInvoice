# EasyInvoice — Local File Storage Design

**Date:** 2026-11-10  
**Status:** Draft — pending user review  
**Context:** Local mode currently stores all data in browser `localStorage`, which is browser- and origin-scoped. After environment changes, users can appear to “lose” data when opening the app in a different browser. This design adds durable on-disk JSON storage for localhost development.

---

## 1. Summary

When running `pnpm dev`, EasyInvoice persists local-mode data as **plain JSON files** under a fixed repo path `EasyInvoice/data/`, via a **Vite local-only API**. Existing browser `localStorage` is **auto-imported once** if the file store is empty, then files become the source of truth. If the API is unavailable (e.g. static production deploy without the plugin), current `localStorage` behavior remains unchanged.

### Goals

- Survive browser switches (Edge ↔ Chrome) while developing on localhost
- Keep data as plain, inspectable JSON on disk for easy backup
- Zero folder-picker UX — fixed path next to the project
- One-time seamless migration from existing `easy-invoice-*` localStorage keys
- Keep `pnpm dev` as the only command users need

### Non-goals

- Encryption / passphrase-protected files
- Separate Express server or multi-process tooling
- SQLite or other database backends
- Desktop wrappers (Tauri/Electron)
- Changing Supabase cloud-mode storage
- Multi-user / multi-process file locking beyond atomic writes
- Manual export/import UI (can be added later)

---

## 2. Decisions (from brainstorming)

| Topic | Choice |
|-------|--------|
| Persistence style | Auto file sync while the app runs |
| Location | Fixed path: repo-root `data/` |
| How to write files | Tiny local API alongside Vite (`pnpm dev`) |
| File format | Plain JSON |
| Existing browser data | Auto-import once into `data/`, then prefer files |

---

## 3. Architecture

```
┌─────────────────────────────┐
│  React app (local mode)     │
│  localStorage.ts            │
│  localCatalog.ts            │
│  localSettings.ts           │
│           │                 │
│           ▼                 │
│  localDataClient.ts         │
│  (in-memory snapshot cache) │
└─────────────┬───────────────┘
              │ GET/PUT /api/local-data
              ▼
┌─────────────────────────────┐
│  Vite plugin middleware     │
│  vite-plugin-local-data.ts  │
└─────────────┬───────────────┘
              │ read/write (atomic)
              ▼
┌─────────────────────────────┐
│  EasyInvoice/data/*.json    │
└─────────────────────────────┘
```

### On-disk layout

```
EasyInvoice/
  data/
    documents.json
    businesses.json
    buyers.json
    line-items.json
    notes.json
    settings.json
    meta.json
```

`data/` is listed in `.gitignore` so personal invoice data is never committed.

### Snapshot shape

Logical snapshot (what the API returns / accepts):

```ts
type LocalDataSnapshot = {
  documents: unknown[];      // current local docs array
  businesses: unknown[];
  activeBusinessId: string | null;
  buyers: unknown[];
  lineItems: unknown[];      // line item presets
  notes: unknown[];          // note presets
  settings: unknown | null;  // org/local settings object
  meta: {
    activeBusinessId: string | null;
    localStorageImported: boolean;
    updatedAt: string;       // ISO timestamp of last successful write
  };
};
```

File contents mirror these fields one-to-one (each file holds the array/object for that key; `meta.json` holds `meta`). On the wire, `activeBusinessId` is duplicated at the snapshot root for client convenience and must stay equal to `meta.activeBusinessId`.

---

## 4. API

Local-only, served by Vite middleware in development:

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/local-data` | Read all JSON files; return full `LocalDataSnapshot`. Missing files → empty defaults. |
| `PUT` | `/api/local-data` | Validate JSON body as snapshot; write each file **atomically** (temp file → rename). Update `meta.updatedAt`. |

### Constraints

- Intended for localhost / Vite dev server only
- No authentication (machine-local trust model)
- Reject non-JSON or structurally invalid bodies with `400` and leave files unchanged
- On read parse failure of an existing file: return `500` with a clear error; do not overwrite with empty defaults automatically

---

## 5. Data flow

### Boot / hydrate

1. App probes `GET /api/local-data`.
2. If the request fails (network / 404 / no plugin) → use existing `localStorage` path (no file backend).
3. If the request succeeds:
   - Load snapshot into an in-memory cache used by local storage modules.
   - If the file store is **empty** (no documents, businesses, buyers, presets, settings) **and** `meta.localStorageImported` is false **and** browser has any `easy-invoice-*` keys → run one-time migration:
     - Copy keys into the snapshot
     - `PUT` snapshot with `meta.localStorageImported = true`
   - If files already have data, files win; browser keys are not auto-merged again.
4. Local-mode UI waits for hydrate (short loading state) before rendering data-dependent pages, to avoid empty→flash.

### Writes

- Existing save/delete helpers keep call sites stable where practical.
- Mutations update the in-memory snapshot, then `PUT /api/local-data`.
- After a successful file write, optionally mirror the same snapshot into `localStorage` as a secondary cache (nice-to-have, not required for correctness once files exist).

### Source of truth rules

| Situation | Source of truth |
|-----------|-----------------|
| File API up, files non-empty | Files |
| File API up, files empty, browser has data, not yet imported | Migrate browser → files once |
| File API up, files empty, no browser data | Empty file store |
| File API down | Browser `localStorage` (current behavior) |

---

## 6. Components

| Piece | Role |
|-------|------|
| `apps/web/vite-plugin-local-data.ts` | Vite plugin registering middleware + filesystem IO under repo-root `data/` |
| `apps/web/vite.config.ts` | Register the plugin |
| `apps/web/src/lib/localDataClient.ts` | Probe, get, put, migrate-from-localStorage helpers |
| `apps/web/src/lib/localStorage.ts` | Document CRUD via snapshot cache + sync |
| `apps/web/src/lib/localCatalog.ts` | Businesses / buyers / presets via snapshot cache + sync |
| `apps/web/src/lib/localSettings.ts` | Settings via snapshot cache + sync |
| App boot (e.g. `main.tsx` / small provider) | Await hydrate before mounting local-mode data UI |
| `.gitignore` | Add `/data/` |

### localStorage key mapping (migration)

| Browser key | File / snapshot field |
|-------------|------------------------|
| `easy-invoice-local-docs` | `documents.json` |
| `easy-invoice-local-businesses` | `businesses.json` |
| `easy-invoice-local-active-business-id` | `meta.json` → `activeBusinessId` (also exposed on snapshot root for the client) |
| `easy-invoice-local-buyers` | `buyers.json` |
| `easy-invoice-local-line-items` | `line-items.json` |
| `easy-invoice-local-notes` | `notes.json` |
| `easy-invoice-org-settings` | `settings.json` |

`meta.json` holds `activeBusinessId`, `localStorageImported`, and `updatedAt`.

---

## 7. Error handling

| Error | Behavior |
|-------|----------|
| Write failure (disk / IO) | Toast error; keep previous successful in-memory snapshot; do not clear UI data |
| Corrupt on-disk JSON | `GET` returns error; app shows toast; do not auto-wipe or overwrite with empty defaults |
| Invalid `PUT` body | `400`; files unchanged |
| API unavailable mid-session after hydrate from files | Toast; keep in-memory state; do not silently switch to empty localStorage |
| API unavailable at boot | Fall back to localStorage-only mode |

---

## 8. Testing

- Unit: snapshot defaults, empty-store detection, migrate-once flag behavior, key mapping
- Unit: reject corrupt / invalid PUT shapes (pure validation helpers)
- Manual: Edge with existing localStorage → `pnpm dev` → confirm `data/*.json` created and populated
- Manual: Open same `http://localhost:5173` in Chrome → same documents appear
- Manual: Stop API / build static → app still works via localStorage fallback
- Manual: Break a JSON file → app errors without deleting the broken file

---

## 9. Out of scope

- Encryption
- Folder picker / File System Access API
- Separate Node process
- SQLite
- Cloud/Supabase changes
- Multi-tab conflict resolution beyond last-write-wins on `PUT`
- Dedicated Settings “Export backup” button (files on disk already serve as backup)

---

## 10. Success criteria

- After one `pnpm dev` session in Edge, `data/` contains the user’s documents as JSON
- Chrome on the same localhost URL shows the same data without re-entry
- Clearing browser site data does **not** wipe `data/` files
- `data/` is gitignored
- Static / non-API deploys continue to use localStorage without breakage
