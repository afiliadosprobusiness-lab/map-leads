# MapLeads - Operational Summary

> **Version:** 2.0.0
> **Last updated:** 2026-02-18
> **Source of truth:** `docs/context.md`

## Product Snapshot

- B2B SaaS to extract structured local business leads from Google Maps.
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui.
- Backend: Cloud Run API (`map-leads-backend`) + Firebase Auth + Firestore.

## Main Routes

- `/` Landing page
- `/auth` Authentication
- `/dashboard` Searches and leads workspace (non-superadmin users)
- `/superadmin` Restricted user-management panel (superadmin only)

## Landing Section Order

1. Hero
2. Testimonials
3. Problem
4. How it works
5. Pricing
6. FAQ
7. CTA

## Auth And Security

- Providers: Email/Password and Google OAuth (Firebase Auth).
- Post-login routing: superadmin email goes to `/superadmin`; others to `/dashboard`.
- Frontend ensures starter docs exist for new users:
  - `profiles/{uid}`
  - `subscriptions/{uid}`
- Firestore rules enforce owner-scoped access and restricted writes.
- Superadmin is allowlisted by `SUPERADMIN_EMAIL`.
- Superadmin requester cannot run scraping jobs.
- Superadmin panel has no dashboard shortcut and shows a clear unavailable-service message when backend is unreachable.

## Environment Variables

Frontend:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_BACKEND_API_URL` (required)
- `VITE_SUPERADMIN_EMAIL` (optional)
- `VITE_PAYPAL_STARTER_URL` (optional)
- `VITE_PAYPAL_GROWTH_URL` (optional)
- `VITE_PAYPAL_PRO_URL` (optional)

Backend runtime (`map-leads-backend`):
- `SUPERADMIN_EMAIL` (optional)
- `APIFY_TOKEN` (optional)
