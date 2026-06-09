# EasyInvoice — Design Specification

**Date:** 2026-06-09  
**Status:** Draft — pending user review  
**Reference:** [Invoice Home](https://invoicehome.com/) (simplified scope)

---

## 1. Summary

EasyInvoice is a user-friendly invoice generator for small businesses. Users create **proforma invoices**, **invoices**, and **receipts** through a split-pane editor with live preview, pick from a small set of professional templates, and export PDFs. Data is stored in the cloud via **Supabase** (PostgreSQL + Auth + Row Level Security) so documents persist across devices and can later be shared within a team.

### Goals

- Simple, Invoice Home–style UX: pick document type → fill form → preview → download PDF
- Correct semantics per document kind (proforma vs invoice vs receipt)
- Cloud persistence with signup/login (Supabase Auth)
- Architecture ready for organization/team features without rework

### Non-goals (v1)

- Online payments (PayPal, Stripe)
- Email delivery of documents
- 100+ templates
- Native mobile apps
- Multi-currency conversion / complex tax engines
- E-invoicing compliance (PEPPOL, etc.)

---

## 2. Target users

**Primary:** Small business owner or office admin (1–10 people) who issues documents occasionally and wants professional PDFs without accounting software complexity.

**Success criteria:**

- New user can sign up and create an invoice in under 5 minutes
- PDF output matches on-screen preview
- Documents list loads in under 1 second for typical usage (<500 docs)
- Two team members (Phase 4) cannot see each other's org data

---

## 3. Document types

Single shared data structure; `kind` drives labels, validation, and PDF header.

| Aspect | Proforma | Invoice | Receipt |
|--------|----------|---------|---------|
| Purpose | Cost estimate before work | Payment request after delivery | Proof of payment |
| Title | PROFORMA INVOICE | INVOICE | RECEIPT |
| Number | Optional quote # (`PRO-`) | Required (`INV-`) | Required (`RCP-`) |
| Due / validity | `valid_until` date | `due_date` + payment terms | Hidden |
| Payment | N/A | Amount due | Amount paid, method, paid date |
| Link | — | — | Optional `source_document_id` |
| Tone | Non-binding estimate | Legally routine bill | Confirmation |

### Shared fields

- **Seller:** name, address, email, phone, tax_id, logo_url
- **Buyer:** name, address, email
- **Meta:** number, issue_date, currency (ISO 4217), notes, template_id
- **Line items:** description, quantity, unit_price, tax_rate_percent, discount_percent
- **Computed:** subtotal, tax_total, discount_total, grand_total

### Kind-specific fields

- **Proforma:** `valid_until`
- **Invoice:** `due_date`, `payment_terms` (e.g. "Net 30")
- **Receipt:** `paid_at`, `payment_method` (cash | card | transfer | check | other), `amount_paid`, optional `source_document_id`

### Workflows

- **New document:** Landing → pick kind → editor with defaults
- **Duplicate as:** Proforma → Invoice (copy line items, assign new INV number); Invoice → Receipt (pre-fill totals, link source)
- **Numbering:** Server-side per organization via `organization_settings` counters

---

## 4. Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 6, React 19, TypeScript, Tailwind CSS |
| Forms / validation | React Hook Form, Zod (in `packages/shared`) |
| Client state | Zustand (editor UI); Supabase for persisted data |
| Backend | Supabase (Postgres, Auth, Storage, RLS) |
| PDF | `@react-pdf/renderer` in `packages/pdf` |
| Monorepo | pnpm workspaces |
| Local dev DB | Supabase CLI (`supabase start`) or hosted project |

### High-level diagram

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (Vite SPA)                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Landing  │  │ Editor   │  │ Preview  │  │ PDF DL  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └─────────────┴─────────────┴─────────────┘     │
│                         │                               │
│              @supabase/supabase-js                      │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Supabase                                               │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Auth    │  │ PostgreSQL   │  │ Storage (logos)  │   │
│  │ (email) │  │ + RLS        │  │ org-scoped paths │   │
│  └─────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────┘

packages/shared  — types, Zod schemas, calculateTotals()
packages/pdf     — React-PDF templates (Classic, Minimal, Modern)
```

### Why Supabase for B

- Built-in email/password auth (OAuth addable later)
- Postgres fits relational invoicing (line items, org settings, sequential numbers)
- RLS enforces org isolation at the database layer
- Storage for logos with path policies tied to `organization_id`
- No custom Node server required for v1–v3

Optional later: Edge Function for PDF if client-side generation is insufficient.

---

## 5. Database schema

### Tables

**organizations**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | Business name |
| created_at | timestamptz | |

**organization_members**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| user_id | uuid FK → auth.users | |
| role | enum | owner, admin, member |
| created_at | timestamptz | |

**organization_settings**

| Column | Type | Notes |
|--------|------|-------|
| organization_id | uuid PK FK | |
| currency | text | Default `USD` |
| invoice_prefix | text | Default `INV` |
| proforma_prefix | text | Default `PRO` |
| receipt_prefix | text | Default `RCP` |
| next_invoice_number | int | Default 1 |
| next_proforma_number | int | Default 1 |
| next_receipt_number | int | Default 1 |
| default_tax_rate | numeric | Default 0 |
| seller_name | text | |
| seller_address | text | |
| seller_email | text | |
| seller_phone | text | |
| seller_tax_id | text | |
| logo_path | text | Storage path |

**documents**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organization_id | uuid FK | |
| kind | enum | proforma, invoice, receipt |
| number | text | Assigned on save |
| issue_date | date | |
| currency | text | |
| notes | text | |
| template_id | text | classic, minimal, modern |
| buyer_name | text | Snapshot at save time |
| buyer_address | text | |
| buyer_email | text | |
| valid_until | date | proforma only |
| due_date | date | invoice only |
| payment_terms | text | invoice only |
| paid_at | timestamptz | receipt only |
| payment_method | text | receipt only |
| amount_paid | numeric | receipt only |
| source_document_id | uuid FK | receipt optional |
| subtotal | numeric | Denormalized for list views |
| tax_total | numeric | |
| discount_total | numeric | |
| grand_total | numeric | |
| created_by | uuid FK | auth.users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**line_items**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| document_id | uuid FK | ON DELETE CASCADE |
| sort_order | int | |
| description | text | |
| quantity | numeric | |
| unit_price | numeric | |
| tax_rate_percent | numeric | |
| discount_percent | numeric | |

### RLS policies (principle)

- Users access rows only where `organization_id` is in their `organization_members` membership
- `INSERT` on documents: member must belong to org; `created_by = auth.uid()`
- `organization_settings`: updatable by owner/admin only
- Storage bucket `logos`: path `{organization_id}/logo.{ext}`; read/write if member

### Auth onboarding trigger

On `auth.users` insert:

1. Create `organizations` row (name from metadata or email domain)
2. Create `organization_members` as `owner`
3. Create default `organization_settings`

---

## 6. Frontend structure

### Routes

| Path | Screen |
|------|--------|
| `/` | Landing — document type cards + recent docs (if logged in) |
| `/login`, `/signup` | Supabase Auth forms |
| `/documents` | List with filter by kind |
| `/documents/new/:kind` | Editor (proforma \| invoice \| receipt) |
| `/documents/:id` | Edit existing |
| `/settings` | Org seller profile, numbering, defaults |

### Editor layout (Invoice Home–inspired)

```
┌────────────────────────────────────────────────────────┐
│  [Logo] EasyInvoice          [Save] [PDF] [Print]    │
├──────────────────────┬─────────────────────────────────┤
│  FORM (scroll)       │  PREVIEW (sticky)               │
│  - Seller (defaults) │  Live template render           │
│  - Buyer             │                                 │
│  - Dates / terms     │                                 │
│  - Line items table  │                                 │
│  - Notes             │  Template picker ▼              │
└──────────────────────┴─────────────────────────────────┘
```

### UX rules

- Defaults: today's date, one empty line item, seller from org settings
- Real-time totals via `calculateTotals()` from shared package
- Validation on Save/PDF only (inline field hints)
- Mobile: stacked form above preview
- Unsaved changes warning on navigate away

### Templates (v1)

1. **Classic** — serif header, bordered table
2. **Minimal** — lots of whitespace, sans-serif
3. **Modern** — accent color bar, bold totals

Start with Classic only in Phase 1; add others in Phase 5.

---

## 7. PDF generation

- **Engine:** `@react-pdf/renderer` in `packages/pdf`
- **Input:** `Document` + `LineItem[]` + `template_id` (same types as DB/API)
- **Flow:** User clicks Download → client fetches document + line items → PDF blob → browser download
- **Filename:** `{kind}-{number}.pdf` (e.g. `invoice-INV-0042.pdf`)
- **Print:** CSS `@media print` on HTML preview as fallback; primary export is React-PDF

Future: Supabase Edge Function if fonts/embed rules need server consistency.

---

## 8. Security & privacy

- All document queries through Supabase client with user JWT; RLS is source of truth
- No service role key in frontend
- Logo uploads: max 2 MB, image/jpeg | image/png | image/webp; client resize before upload
- Rate limiting: rely on Supabase platform limits for v1
- HTTPS only in production

---

## 9. Phased delivery

### Phase 1 — Foundation

- pnpm monorepo scaffold
- `packages/shared`: types, Zod, calculations
- Supabase project + migrations + RLS skeleton
- Auth signup/login
- Invoice editor + Classic template + preview
- Save/load documents (invoice only)
- PDF download

### Phase 2 — Document kinds

- Proforma and receipt kinds, validation, PDF headers
- Duplicate-as flows
- Documents list with kind filter

### Phase 3 — Org settings & numbering

- Seller profile + logo upload to Storage
- Auto-increment document numbers per kind
- Settings page

### Phase 4 — Team (minimal)

- Invite member by email (Supabase invite or magic link)
- Roles: owner, admin, member
- Shared document list within org

### Phase 5 — Polish

- Minimal + Modern templates
- JSON export/import (single document)
- Empty states, loading skeletons, error toasts

---

## 10. Testing strategy

| Layer | Tool | Focus |
|-------|------|-------|
| calculations, Zod | Vitest | totals, per-kind validation |
| React components | Vitest + Testing Library | LineItemsTable, totals display |
| RLS | Supabase local + SQL tests | cross-org access denied |
| E2E (optional) | Playwright | signup → create invoice → PDF |

---

## 11. Deployment

| Component | Target |
|-----------|--------|
| `apps/web` | Vercel or Netlify (static + env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| Supabase | Hosted project (staging + production) |
| Migrations | `supabase db push` via CI on merge to main |

---

## 12. Open decisions (resolved)

| Question | Decision |
|----------|----------|
| Use case | B — small business, cloud + teams later |
| Auth/DB | A — Supabase |
| Build tool | Vite (not Next.js) |
| Custom Node API | Deferred; Supabase direct + optional Edge Functions |

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| PDF ≠ preview | Single data pipeline into both HTML preview and React-PDF |
| RLS misconfiguration | Integration tests with two test users |
| Number collisions | DB function `assign_document_number(org_id, kind)` with row lock |
| Scope creep | Strict phase gates; payment/email explicitly out of scope |
