# Local File Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist EasyInvoice local-mode data as plain JSON under repo-root `data/` via a Vite localhost API, with one-time localStorage migration.

**Architecture:** Vite middleware serves `GET/PUT /api/local-data`. On boot the app hydrates from files (or migrates browser keys once). Existing sync localStorage helpers keep working: file mode seeds/mirrors browser storage and debounced-persists a full snapshot after writes.

**Tech Stack:** Vite 6 plugin/middleware, Node `fs`/`path`, React hydrate gate, Vitest for pure helpers.

## Global Constraints

- Fixed path: repo-root `data/` (not under `apps/web`)
- Plain JSON only; no encryption
- API localhost/dev only; production without plugin falls back to localStorage
- Auto-import localStorage once when files empty
- `data/` must be gitignored
- Keep `pnpm dev` as the only start command

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/localDataTypes.ts` | Snapshot type, empty defaults, empty detection, browser key map, validation |
| `apps/web/src/lib/localDataTypes.test.ts` | Unit tests for pure helpers |
| `apps/web/vite-plugin-local-data.ts` | Read/write `../../data` + middleware |
| `apps/web/vite.config.ts` | Register plugin |
| `apps/web/src/lib/localDataSync.ts` | hydrate, seed localStorage, schedulePersist, file-mode flag |
| `apps/web/src/lib/localStorage.ts` | Call `schedulePersist` after doc writes |
| `apps/web/src/lib/localCatalog.ts` | Call `schedulePersist` after catalog writes |
| `apps/web/src/lib/localSettings.ts` | Call `schedulePersist` after settings writes |
| `apps/web/src/components/LocalDataGate.tsx` | Await hydrate before rendering app |
| `apps/web/src/main.tsx` | Wrap app in gate |
| `.gitignore` | Add `/data/` |

---

### Task 1: Pure snapshot helpers + tests

**Files:**
- Create: `apps/web/src/lib/localDataTypes.ts`
- Create: `apps/web/src/lib/localDataTypes.test.ts`
- Modify: `apps/web/package.json` (ensure vitest can resolve `@/` if needed — prefer relative imports in tests)

**Interfaces:**
- Produces: `LocalDataSnapshot`, `emptySnapshot()`, `isSnapshotEmpty()`, `isValidSnapshot()`, `BROWSER_KEYS`, `snapshotFromBrowserStorage(getItem)`, `applySnapshotToBrowserStorage(snapshot, setItem)`

- [ ] **Step 1: Write failing tests** for empty detection, validation, browser round-trip mapping
- [ ] **Step 2: Implement `localDataTypes.ts`**
- [ ] **Step 3: Run `pnpm --filter @easy-invoice/web test`** — expect PASS
- [ ] **Step 4: Commit**

---

### Task 2: Vite local-data plugin

**Files:**
- Create: `apps/web/vite-plugin-local-data.ts`
- Modify: `apps/web/vite.config.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: same snapshot shape as Task 1 (duplicate validate inline or import from a tiny shared node-safe module — keep validation duplicated lightly in plugin to avoid bundling browser code into Node, OR put pure helpers in `localDataTypes.ts` with no DOM deps so plugin can import them)
- Produces: plugin `localDataPlugin()` registering `GET/PUT /api/local-data`, atomic writes under `<repo>/data/`

- [ ] **Step 1: Implement plugin** with atomic write (`*.tmp` → rename), missing files → empty defaults, corrupt read → 500, invalid PUT → 400
- [ ] **Step 2: Register in vite.config + gitignore `/data/`**
- [ ] **Step 3: Smoke `pnpm --filter @easy-invoice/web dev`** and curl GET
- [ ] **Step 4: Commit**

---

### Task 3: Client hydrate + persist

**Files:**
- Create: `apps/web/src/lib/localDataSync.ts`
- Modify: `apps/web/src/lib/localStorage.ts`, `localCatalog.ts`, `localSettings.ts`

**Interfaces:**
- Produces: `hydrateLocalData(): Promise<"file" | "browser">`, `schedulePersist(): void`, `isFileBackendActive(): boolean`
- Behavior: on file mode, seed localStorage from snapshot; if empty files + browser data + not imported → PUT migrated snapshot; after local writes debounce PUT from current localStorage

- [ ] **Step 1: Implement sync module**
- [ ] **Step 2: Hook `schedulePersist` into all local write paths**
- [ ] **Step 3: Commit**

---

### Task 4: Boot gate + verify

**Files:**
- Create: `apps/web/src/components/LocalDataGate.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Gate component** shows brief loading until hydrate settles; toast on corrupt-file error
- [ ] **Step 2: Wrap `<App />`**
- [ ] **Step 3: Manual verify** — GET returns data; save doc creates/updates `data/*.json`
- [ ] **Step 4: Commit**

---

## Spec coverage check

- Fixed `data/` path + gitignore → Task 2
- GET/PUT API + atomic writes + corrupt/invalid handling → Task 2
- Auto-migrate once → Task 3
- Sync helpers + persist → Task 3
- Boot hydrate gate → Task 4
- Unit tests for empty/migrate/validate → Task 1
- localStorage fallback when API down → Task 3/4
