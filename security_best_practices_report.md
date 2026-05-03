# Security Best Practices Report

## Executive Summary

Reviewed the Astro 6, React 19, TypeScript, and Vercel Functions codebase against JavaScript/TypeScript frontend and web-server security guidance. No committed secrets were found, and `.env` is ignored by Git. The highest-impact issues were remediated directly: overly broad CORS behavior, missing request timeouts, loose API input handling, raw SVG injection, and missing baseline deployment headers.

## Fixed Findings

### S-001: Broad CORS Default on Places API

- Severity: Medium
- Location: `api/places.ts:23`
- Evidence: The API previously defaulted `Access-Control-Allow-Origin` to `*`.
- Impact: Browser clients on other origins could call the Places proxy and consume quota if the endpoint was reachable.
- Fix: `api/places.ts:23-52` now derives allowed origins from `ALLOWED_ORIGIN` or same host, sets `Vary: Origin`, and rejects foreign browser origins before KV/Google calls.

### S-002: External API Calls Without Timeouts

- Severity: Medium
- Location: `api/places.ts:167`, `api/contact.ts:45`
- Evidence: Google Places, KV, URL resolution, and Resend requests could wait indefinitely.
- Impact: Slow upstreams could tie up serverless execution and create poor failure behavior.
- Fix: Added `AbortController`-based timeouts in `api/places.ts:167-176` and `api/contact.ts:45-57`.

### S-003: Loose Contact Form Input Handling

- Severity: Medium
- Location: `api/contact.ts:60`
- Evidence: The endpoint accepted any parsed body shape and did not cap text fields.
- Impact: Large or malformed payloads could increase email/API load and produce inconsistent validation.
- Fix: `api/contact.ts:68-87` now requires JSON, normalizes strings, caps field lengths, lowercases email, preserves honeypot behavior, and keeps responses non-cacheable.

### S-004: Raw SVG HTML Injection in Footer

- Severity: Low
- Location: `src/components/Footer.astro:1`
- Evidence: The footer previously imported `lo_logo.svg?raw` and rendered it with `set:html`.
- Impact: Local SVG content is trusted, but raw HTML sinks expand the XSS review surface and should be avoided when an image import works.
- Fix: Footer now uses Astro's asset URL import and a normal `<img>` at `src/components/Footer.astro:1-12`.

### S-005: Missing Baseline Security Headers in Repo

- Severity: Low
- Location: `vercel.json:1`
- Evidence: No app-level Vercel header configuration was present.
- Impact: Browser hardening depended entirely on platform defaults or external configuration.
- Fix: Added `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy` in `vercel.json:1-25`.

## Residual Recommendations

### R-001: Add a CSP After Inline Script Strategy Is Decided

- Severity: Low
- Location: `src/layouts/BaseLayout.astro:24`, `src/components/Header.astro:71`, `src/pages/index.astro:541`
- Note: A strict CSP is recommended, but this site currently uses Astro inline scripts, Google-hosted Material Symbols CSS, and a Cal.com iframe. Adding CSP without hashing/noncing scripts and explicitly allowing required frame/font/style sources could break production. Treat this as a follow-up hardening task rather than a blind header addition.

### R-002: Keep Google Places Key Restricted in Google Cloud

- Severity: Medium
- Location: Environment configuration
- Note: `GOOGLE_PLACES_API_KEY` is server-side, which is correct. It should still be restricted by API and deployment environment in Google Cloud, with budget alerts enabled as noted in `README.md`.
