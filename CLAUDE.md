# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

One Astro 7 codebase for two products at `https://www.lokaloptimal.at`:

1. **Public landing page** (`/`, `/impressum`, `/datenschutz`, `/agb`): static, German, for Austrian local businesses. It includes a free Google Business Profile check (`GBPAuditWidget`) and a contact form.
2. **Internal dashboard** (`/dashboard/**`): a single-user, Supabase-backed workspace that runs the sales and delivery pipeline: leads → calls → audits → offers (PDF) → projects.

All UI copy, domain enums, DB values and code comments are in **German** (formal "Sie"). Keep it that way.

## Commands

```bash
npm run dev            # http://127.0.0.1:4321 (dashboard at /dashboard)
npm run build
npm test               # vitest run
npx vitest run src/lib/dashboard/offers.test.ts   # single file
npx vitest run -t "name of test"                   # single test by name
supabase test db       # pgTAP RLS tests in supabase/tests/ (needs local Supabase CLI stack)
vercel dev             # needed to exercise the root api/ functions locally
```

There is no lint script. Type checking comes from `astro/tsconfigs/strict` (`npx astro check` if needed).

The repo lives on an external volume that produces macOS `._*` AppleDouble files. They are gitignored and excluded in `vitest.config.ts`. Ignore them, and keep them out of any new globs.

## Architecture

### Rendering split
- Public pages are prerendered (static by default).
- Every dashboard page and every `src/pages/api/internal/**` route declares `export const prerender = false` and runs on the Vercel adapter. Add this to any new dashboard or internal route.
- `src/middleware.ts` gates `/dashboard/**` (except `/dashboard/login`) and `/api/internal/**` with Supabase `auth.getUser()`, sets `locals.user`, and adds no-store/noindex/privacy headers. `vercel.json` repeats those headers. The sitemap filter, `robots.txt` and meta tags also exclude the dashboard. Keep all of these layers when adding routes.

### Two kinds of API endpoints
- **`api/` (repo root):** native Vercel Functions for the *public* site: `places.ts` (GBP check via Google Places API (New), rate-limited per user through Upstash KV, `GBP_AUDIT_DAILY_LIMIT`) and `contact.ts` (Resend). They are not Astro routes and need `vercel dev` to run locally.
- **`src/pages/api/internal/`:** authenticated Astro routes for the dashboard. `places/lookup.ts` reuses the helpers exported from root `api/places.ts`. `offers/[id]/pdf.ts` renders offer PDFs with `@react-pdf/renderer` (`src/lib/dashboard/offer-pdf.tsx`) into the private `offers` storage bucket.

### Dashboard data flow
- **Reads:** `src/lib/dashboard/queries.ts` is called from `.astro` page frontmatter with the request context.
- **Writes:** every mutation is an Astro Action in `src/actions/index.ts` (zod-validated). Each action calls `authenticated()` and then the Supabase server client (`src/lib/supabase/server.ts`, cookie-based `@supabase/ssr`). React forms in `src/components/dashboard/` call these actions; `action-utils.ts` has the shared client-side handling.
- **Business rules** live in pure, unit-tested modules under `src/lib/dashboard/`. Actions enforce these rules, and the modules are where you change them:
  - `workflow.ts`: lead statuses that require a next action and due date, the offer status state machine (`entwurf → erstellt → versendet → angenommen/abgelehnt/abgelaufen`), and when an offer can be edited, archived, deleted or converted to a project.
  - `calls.ts`: call outcomes, required follow-ups, suggested lead status, `do_not_call`.
  - `audit.ts`: audit criteria, score, priority and recommendations. It maps recommendations to packages and add-ons from `src/data/pricing.ts`.
  - `offers.ts`: offer line items and totals.
  - `insights.ts`: overview metrics.
  - `types.ts`: the German status enums, which must match the DB enums.
- **Status enum values appear in three places:** `types.ts`, the `as const` arrays at the top of `actions/index.ts`, and the SQL migrations. Change all three together.

### Shared code between the public site and the dashboard
- `src/data/pricing.ts` is the single source for packages and add-ons. The landing page pricing, `BedarfsCheck`, dashboard audit recommendations and offer forms all read from it.
- `src/lib/place-signals.ts` derives the signal levels used by both the public GBP widget and the internal audit, so both apply the same thresholds. **It ships in the public homepage bundle:** it must not import Supabase, `astro:env`, or anything from `lib/dashboard/`. Dependencies only flow from the dashboard to it, never the reverse. `src/lib/audit-response.ts` (classifies the widget's API responses, including the `PLACE_NOT_FOUND` case) follows the same rule.

### Database
- Supabase Postgres migrations live in `supabase/migrations/` (timestamp-prefixed and applied in order). Add a new migration for every schema change and don't edit applied ones.
- RLS is enforced on all dashboard tables, and offer PDFs are stored under the user's own path in the `offers` bucket. Add RLS policies and pgTAP coverage in `supabase/tests/dashboard_rls.sql` for new tables.
- Public sign-up is disabled, and the one internal user is created manually. Offer PDFs need the sender details from `/dashboard/settings` before they can be generated.

### Legacy
`tool/` holds the original standalone GBP widget, kept for reference. The live code is `src/components/GBPAuditWidget.tsx` and `api/places.ts`.

## Design context

`.impeccable.md` holds the design brief for both surfaces. Read it before UI work. The essentials:
- Light mode only, with brand blue `#4466f6` and logo cream `#fcf6e8`. No glassmorphism, glows, dark neon or purple-blue gradients.
- Landing page: factual, trustworthy, mobile-first, with prices shown openly and one CTA focus (booking the first call).
- Dashboard: "today first" (due and overdue work dominates), only real data in charts (each with a label and a text alternative), nothing hidden on mobile, and full `prefers-reduced-motion` support.
- **Privacy:** no trackers, external fonts or icon CDNs in the dashboard. Fonts are self-hosted via `@fontsource-variable/onest`, and icons come from `@phosphor-icons/react` or the local `icons.tsx`/`DashboardIcon.tsx`.
- Styling is Tailwind 4 plus a custom CSS token system in `src/styles/global.css` (public) and `src/styles/dashboard.css` (dashboard).

## Environment

See `.env.example`. Required for the dashboard: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Without them, the middleware redirects to `/dashboard/login?setup=1`. Also required: `GOOGLE_PLACES_API_KEY` (read via `astro:env/server` `getSecret` in internal routes). The public functions also use `KV_REST_API_*`, `ALLOWED_ORIGIN`, `RESEND_API_KEY`, `CONTACT_*_EMAIL` and `PUBLIC_CAL_URL`.

## Open items before launch (from README)

The legal pages (`impressum`, `datenschutz`, `agb`) still contain placeholder text. A GDPR cookie consent banner is needed before adding any non-essential scripts.
