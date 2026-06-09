# EasyInvoice

A simple, user-friendly invoice generator for small businesses. Create **proforma invoices**, **invoices**, and **receipts** with a live preview, then download print-ready PDFs.

Inspired by [Invoice Home](https://invoicehome.com/) with a focused scope: three document types, professional templates, and optional cloud storage via Supabase.

![EasyInvoice](apps/web/public/favicon.svg)

## Features

### Document types

| Type | Purpose |
|------|---------|
| **Proforma invoice** | Cost estimate before work begins |
| **Invoice** | Payment request with due date and terms |
| **Receipt** | Proof of payment received |

### Editor & export

- Split-pane UI — form on the left, live preview on the right
- Three PDF templates: **Classic**, **Minimal**, **Modern**
- Download PDF or print from the browser
- PDF filename format: `[Document Number]-[Issue Date].pdf` (e.g. `INV-0001-2026-06-09.pdf`)
- Duplicate workflows: Proforma → Invoice → Receipt

### Numbering & currency

- Default currency: **MYR** (configurable)
- Custom **prefix** per document type (e.g. `INV`, `BILL`, `INV-MY`)
- Configurable **next number** counter for auto-assignment
- Optional manual document number in the editor

### Local mode (no setup)

Works immediately without a backend. Data is stored in your browser:

- Multiple **business profiles** (From / seller)
- Saved **buyers** — pick from history or enter new
- Saved **line item descriptions** — autocomplete with price and tax
- Documents, settings, and catalog persist in `localStorage`

### Cloud mode (optional)

Connect [Supabase](https://supabase.com/) for:

- Sign up / sign in
- Cloud document storage with Row Level Security
- Organization settings and auto-numbering (database-backed)
- Team invites via magic link
- Logo upload to Supabase Storage

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 6, React 19, TypeScript, Tailwind CSS |
| Validation | Zod, React Hook Form |
| PDF | `@react-pdf/renderer` |
| Backend (optional) | Supabase — Auth, PostgreSQL, Storage, RLS |
| Monorepo | pnpm workspaces |

---

## Quick start

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`corepack enable` if needed)

### Install

```bash
git clone <your-repo-url>
cd EasyInvoice
pnpm install
```

### Run in local mode

No environment variables required:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

A **Local mode** badge appears in the header. All documents and saved contacts stay in your browser.

### Run with Supabase (cloud mode)

1. Create a project at [supabase.com](https://supabase.com/).
2. Copy the example env file:

   ```bash
   cp .env.example apps/web/.env
   ```

3. Set your project values in `apps/web/.env`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Apply database migrations:

   ```bash
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

---

## Usage

### Create a document

1. From the home page, choose **Proforma Invoice**, **Invoice**, or **Receipt**.
2. Fill in seller, buyer, line items, and dates.
3. Preview updates in real time on the right.
4. Click **Save** to store the document.
5. Click **Download PDF** or **Print**.

### Local mode tips

| Task | Where |
|------|-------|
| Switch business (From) | Editor → saved business dropdown |
| Pick a saved buyer | Editor → Saved buyer dropdown |
| Reuse line items | Type or select from description autocomplete |
| Manage businesses | **Settings → Businesses** |
| Manage buyers & line items | **Settings → Buyers & Items** |
| Set currency, prefixes, counters | **Settings → Defaults** |

### Document numbering

In **Settings → Defaults → Document numbering**:

- Set a **prefix** for each document type
- Set the **next number** (counter)

Leave the document number blank when saving a new document to auto-assign (e.g. `INV-0001`). Or enter a custom number in the editor.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server (`apps/web`) |
| `pnpm build` | Production build for all packages |
| `pnpm test` | Run Vitest tests (`packages/shared`) |
| `pnpm lint` | Lint workspace packages |

---

## Project structure

```
EasyInvoice/
├── apps/
│   └── web/                 # Vite React SPA
│       └── src/
│           ├── components/  # Editor, preview, layout
│           ├── hooks/       # Auth, documents, local catalog
│           ├── lib/         # Supabase, localStorage, PDF helpers
│           └── pages/       # Landing, documents, settings, team
├── packages/
│   ├── shared/              # Types, Zod schemas, calculations
│   └── pdf/                 # React-PDF templates
├── supabase/
│   └── migrations/          # PostgreSQL schema, RLS, triggers
└── docs/superpowers/        # Design spec & implementation plan
```

---

## Deployment

### Frontend

```bash
pnpm build
```

Deploy the `apps/web/dist` folder to [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/), or any static host.

Set environment variables on the host:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

(Omit both to run as local-only; users’ data stays in the browser.)

### Database

Push migrations to your Supabase project on release:

```bash
npx supabase db push
```

---

## Supported currencies

MYR (default), USD, SGD, EUR, GBP, AUD, CAD, CNY, JPY, THB, IDR

---

## Privacy

- **Local mode:** Data never leaves your browser. Clearing site data removes documents and saved contacts.
- **Cloud mode:** Documents are stored in your Supabase project under organization-scoped Row Level Security.

---

## License

Private / unlicensed — add your license here if you plan to open-source the project.
