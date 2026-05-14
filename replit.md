# S.S. Jewellers Invoicing

A GST-compliant invoicing web application for S.S. Jewellers (Delhi). Allows jewellers to create multi-item invoices with automatic GST and making-charge calculations, download professional PDFs, and view a monthly sales dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/jewellers run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Wouter + TanStack Query + Tailwind CSS + shadcn/ui
- Auth: Clerk (Replit-managed)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod v3 (`zod`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-client-react`, `lib/api-zod`)
- PDF: pdfkit
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks + schemas
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/pdf.ts` — pdfkit PDF generator
- `artifacts/jewellers/src/pages/` — React page components
- `artifacts/jewellers/src/components/layout.tsx` — App shell with sidebar nav

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen for both client hooks and server validation schemas
- Clerk proxy runs through the Express server so auth cookies work across the shared proxy
- GST rates are fixed per Indian jewellery rules: 3% on jewel value, 5% on making charges
- PDF is generated server-side using pdfkit on demand (not stored)
- Invoice numbers auto-increment per user: `INV-001`, `INV-002`, …

## Product

- Landing page for unauthenticated users with feature overview
- Sign in / Sign up via Clerk
- Dashboard: 6 stat cards + monthly GST bar chart + 5 recent invoices
- Invoices list with search by customer name or invoice number
- New invoice form: customer details + multi-item entries with auto-calculated amounts, making charges, and GST
- Invoice detail view with itemized breakdown and totals
- PDF download from invoice detail page
- Shop profile page for business details (shop name, GST number, UPI ID, address, state)

## User preferences

- Delhi-based jewellery business
- Indian currency formatting (₹ with en-IN locale)
- GST rates: Jewel 3%, Making Charges 5%

## Gotchas

- Use `zod` (v3) not `zod/v4` for form schemas — `@hookform/resolvers/zod` expects v3 types
- `pdfkit` requires `@swc/helpers` as a peer dep — must be in `api-server` dependencies
- `@clerk/themes` must be in `@workspace/jewellers` dependencies (not devDependencies)
- API server routes return 302 (Clerk redirect) for unauthenticated requests — this is correct

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
