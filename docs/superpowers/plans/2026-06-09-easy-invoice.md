# EasyInvoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small-business invoice generator (proforma, invoice, receipt) with Vite React frontend, Supabase auth/storage, live preview, and PDF export.

**Architecture:** pnpm monorepo with `apps/web` (Vite SPA), `packages/shared` (types/calculations), `packages/pdf` (React-PDF). Supabase Postgres + RLS for multi-tenant documents. No custom Node server in Phase 1.

**Tech Stack:** Vite 6, React 19, TypeScript, Tailwind, Zod, React Hook Form, Zustand, Supabase JS v2, @react-pdf/renderer, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-06-09-easy-invoice-design.md`

---

## File structure (target)

```
easy-invoice/
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── lib/supabase.ts
│           ├── routes/
│           ├── pages/
│           ├── components/editor/
│           ├── components/preview/
│           └── hooks/useDocument.ts
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   │       ├── types.ts
│   │       ├── schemas.ts
│   │       └── calculations.ts
│   └── pdf/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           └── templates/Classic.tsx
└── supabase/
    ├── config.toml
    └── migrations/
        └── 20260609000000_initial_schema.sql
```

---

## Phase 1 — Foundation

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `apps/web/*`, `packages/shared/*`, `packages/pdf/*`

- [ ] **Step 1: Root package.json**

```json
{
  "name": "easy-invoice",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @easy-invoice/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Scaffold Vite app**

Run: `cd F:\Git\EasyInvoice && pnpm create vite apps/web --template react-ts`

- [ ] **Step 4: Add Tailwind to web**

Run: `cd apps/web && pnpm add -D tailwindcss @tailwindcss/vite`

- [ ] **Step 5: Verify dev server**

Run: `pnpm dev`  
Expected: Vite serves default React page at `http://localhost:5173`

---

### Task 2: Shared package — types & calculations

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/src/types.ts`, `packages/shared/src/calculations.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/calculations.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/shared/src/calculations.test.ts
import { describe, it, expect } from "vitest";
import { calculateTotals } from "./calculations";
import type { LineItemInput } from "./types";

describe("calculateTotals", () => {
  it("sums line items with tax and discount", () => {
    const items: LineItemInput[] = [
      { quantity: 2, unit_price: 100, tax_rate_percent: 10, discount_percent: 0 },
      { quantity: 1, unit_price: 50, tax_rate_percent: 0, discount_percent: 10 },
    ];
    const result = calculateTotals(items);
    expect(result.subtotal).toBe(250);
    expect(result.tax_total).toBe(20);
    expect(result.discount_total).toBe(5);
    expect(result.grand_total).toBe(265);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd packages/shared && pnpm vitest run`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement types and calculations**

```typescript
// packages/shared/src/types.ts
export type DocumentKind = "proforma" | "invoice" | "receipt";

export interface LineItemInput {
  quantity: number;
  unit_price: number;
  tax_rate_percent: number;
  discount_percent: number;
}

export interface Totals {
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
}
```

```typescript
// packages/shared/src/calculations.ts
import type { LineItemInput, Totals } from "./types";

export function calculateTotals(items: LineItemInput[]): Totals {
  let subtotal = 0;
  let tax_total = 0;
  let discount_total = 0;

  for (const item of items) {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineDiscount = lineSubtotal * (item.discount_percent / 100);
    const taxable = lineSubtotal - lineDiscount;
    const lineTax = taxable * (item.tax_rate_percent / 100);
    subtotal += lineSubtotal;
    discount_total += lineDiscount;
    tax_total += lineTax;
  }

  return {
    subtotal: round2(subtotal),
    tax_total: round2(tax_total),
    discount_total: round2(discount_total),
    grand_total: round2(subtotal - discount_total + tax_total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `cd packages/shared && pnpm vitest run`  
Expected: PASS (1 test)

- [ ] **Step 5: Wire web dependency**

Run: `cd apps/web && pnpm add @easy-invoice/shared@workspace:*`

---

### Task 3: Supabase schema & RLS

**Files:**
- Create: `supabase/migrations/20260609000000_initial_schema.sql`
- Create: `supabase/seed.sql` (optional test org)

- [ ] **Step 1: Init Supabase**

Run: `cd F:\Git\EasyInvoice && npx supabase init`

- [ ] **Step 2: Write migration** (organizations, members, settings, documents, line_items, enums, RLS policies, onboarding trigger)

Key SQL includes:

```sql
CREATE TYPE document_kind AS ENUM ('proforma', 'invoice', 'receipt');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

-- assign_document_number(org_id, kind) function with SELECT FOR UPDATE on organization_settings
-- handle_new_user() trigger on auth.users
-- RLS: documents visible where organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
```

- [ ] **Step 3: Apply migration locally**

Run: `npx supabase start && npx supabase db reset`  
Expected: Migration applies without errors

- [ ] **Step 4: Verify RLS**

Run SQL as two different test users; confirm user A cannot `SELECT` user B's documents.

---

### Task 4: Supabase client & auth UI

**Files:**
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/pages/SignupPage.tsx`
- Create: `apps/web/src/hooks/useAuth.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Install Supabase**

Run: `cd apps/web && pnpm add @supabase/supabase-js react-router-dom`

- [ ] **Step 2: supabase.ts**

```typescript
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 3: Login/signup forms** using `supabase.auth.signInWithPassword` / `signUp`

- [ ] **Step 4: Manual test**

Run: `pnpm dev` → signup → confirm session in browser devtools → redirect to `/documents`

---

### Task 5: Invoice editor (invoice kind only)

**Files:**
- Create: `apps/web/src/components/editor/LineItemsTable.tsx`
- Create: `apps/web/src/components/editor/DocumentEditor.tsx`
- Create: `apps/web/src/components/preview/HtmlPreview.tsx`
- Create: `apps/web/src/pages/NewDocumentPage.tsx`
- Create: `apps/web/src/hooks/useDocument.ts`

- [ ] **Step 1: LineItemsTable** — add/remove rows, numeric inputs, live totals from `calculateTotals`

- [ ] **Step 2: DocumentEditor** — seller, buyer, issue_date, due_date, payment_terms, notes

- [ ] **Step 3: Split layout** — `grid grid-cols-1 lg:grid-cols-2` form + sticky preview

- [ ] **Step 4: Save to Supabase**

```typescript
// Insert documents + line_items in transaction via RPC or two-step with rollback on failure
const { data: doc } = await supabase.from("documents").insert({ ... }).select().single();
await supabase.from("line_items").insert(items.map((item, i) => ({ ...item, document_id: doc.id, sort_order: i })));
```

- [ ] **Step 5: Manual test** — create invoice, refresh page, data persists

---

### Task 6: Classic PDF template

**Files:**
- Create: `packages/pdf/src/templates/Classic.tsx`
- Create: `packages/pdf/src/index.ts`
- Create: `apps/web/src/lib/downloadPdf.ts`

- [ ] **Step 1: Install React-PDF**

Run: `cd packages/pdf && pnpm add @react-pdf/renderer`

- [ ] **Step 2: Classic template** — header INVOICE, seller/buyer blocks, line table, totals

- [ ] **Step 3: downloadPdf helper** — `pdf()` → blob → `<a download>`

- [ ] **Step 4: Wire Download PDF button** on editor toolbar

- [ ] **Step 5: Manual test** — PDF opens with correct totals matching preview

---

## Phase 2 — All document kinds

### Task 7: Zod schemas per kind

**Files:**
- Create: `packages/shared/src/schemas.ts`
- Test: `packages/shared/src/schemas.test.ts`

- [ ] **Step 1: Tests** — invoice requires `due_date`; receipt requires `paid_at` + `payment_method`; proforma allows `valid_until`

- [ ] **Step 2: Implement `documentSchema(kind)` discriminated union**

- [ ] **Step 3: Validate on save in useDocument hook**

---

### Task 8: Proforma & receipt UI + PDF headers

**Files:**
- Modify: `DocumentEditor.tsx`, `HtmlPreview.tsx`, `packages/pdf/src/templates/Classic.tsx`
- Create: `apps/web/src/lib/duplicateDocument.ts`

- [ ] **Step 1: Kind-specific form sections** (show/hide due_date vs paid_at vs valid_until)

- [ ] **Step 2: PDF title per kind** — PROFORMA INVOICE / INVOICE / RECEIPT

- [ ] **Step 3: Landing page** — three cards linking to `/documents/new/proforma` etc.

- [ ] **Step 4: Duplicate as** — copy document + line_items, assign new kind and number

---

### Task 9: Documents list

**Files:**
- Create: `apps/web/src/pages/DocumentsPage.tsx`

- [ ] **Step 1: Query** `documents` ordered by `updated_at desc`

- [ ] **Step 2: Filter tabs** — All | Proforma | Invoice | Receipt

- [ ] **Step 3: Row actions** — Edit, Download PDF, Duplicate

---

## Phase 3 — Settings & numbering

### Task 10: Organization settings page

**Files:**
- Create: `apps/web/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Load/update organization_settings**

- [ ] **Step 2: Seller defaults** pre-fill new documents

- [ ] **Step 3: Logo upload** to Storage bucket `logos` at `{org_id}/logo.png`

---

### Task 11: Auto document numbers

**Files:**
- Modify: `supabase/migrations/` — add `assign_document_number` RPC

- [ ] **Step 1: DB function** increments `next_invoice_number` etc. atomically

- [ ] **Step 2: Call RPC on document insert** before save

- [ ] **Step 3: Test** — two rapid saves get INV-0001 and INV-0002

---

## Phase 4 — Team (minimal)

### Task 12: Member invite

- [ ] **Step 1: Invite flow** via `supabase.auth.admin.inviteUserByEmail` (Edge Function) or manual add by email lookup

- [ ] **Step 2: Members list UI** with roles

- [ ] **Step 3: RLS test** — member sees org documents, not other orgs

---

## Phase 5 — Templates & polish

### Task 13: Minimal & Modern templates

- [ ] **Step 1: Add templates to packages/pdf**

- [ ] **Step 2: Template picker in editor**

- [ ] **Step 3: Persist template_id on document**

---

### Task 14: UX polish

- [ ] **Step 1: Toast errors** (sonner or similar)

- [ ] **Step 2: Loading skeletons** on documents list

- [ ] **Step 3: Unsaved changes guard** (react-router `useBlocker`)

- [ ] **Step 4: Mobile responsive pass**

---

## Verification checklist (before claiming Phase 1 complete)

- [ ] `pnpm test` passes in shared package
- [ ] Signup → create invoice → save → reload → edit works
- [ ] PDF totals match editor totals
- [ ] RLS blocks cross-org read (SQL test)
- [ ] `pnpm build` succeeds for web

---

## Execution handoff

**Plan saved to:** `docs/superpowers/plans/2026-06-09-easy-invoice.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement tasks in this session with checkpoints

Which approach do you want to start Phase 1 with?
