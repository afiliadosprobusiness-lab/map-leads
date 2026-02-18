# MapLeads - Product Context

> **Version:** 2.0.0
> **Last updated:** 2026-02-18
> **Status:** MVP

---

## 1. Product Objective

MapLeads is a B2B SaaS platform that extracts structured local business leads from Google Maps.

Core flow:
- User defines keyword + city + country
- Platform scrapes and structures lead data
- User exports CSV and runs outreach

---

## 2. Target Users

- SMB sales teams and SDRs
- Lead-generation freelancers
- Outreach and marketing agencies

---

## 3. Technology Stack

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Router v6
- Firebase Web SDK (Auth, Firestore)

### Backend
- Cloud Run service: `map-leads-backend` (Express + TypeScript)
- Firebase Authentication (ID token verification)
- Cloud Firestore
- Apify actor: `compass~crawler-google-places`

### Billing
- PayPal checkout links from frontend by plan

---

## 4. Main Routes

- `/` Landing page
- `/auth` Authentication
- `/dashboard` Searches and leads workspace (non-superadmin users)
- `/superadmin` Restricted user-management panel (superadmin only)

---

## 5. Firestore Collections

- `profiles/{uid}`: plan, quota, suspension, identity metadata
- `searches/{searchId}`: scraping jobs by user
- `leads/{leadId}`: extracted businesses
- `subscriptions/{uid}`: plan snapshot

Plan limits:
- `starter`: 2000
- `growth`: 5000
- `pro`: 15000

---

## 6. Security Model

### Auth
- All dashboard and superadmin flows require Firebase authenticated user.
- Supported providers: Email/Password and Google OAuth (Firebase Auth).

### Access Control
- Firestore rules enforce owner-scoped reads and controlled writes.
- Client cannot mutate lead results or privileged plan/suspension fields.
- Superadmin operations are only available through Cloud Run backend API.

### Superadmin
- Allowlist by email: `afiliadosprobusiness@gmail.com` (or runtime override via `SUPERADMIN_EMAIL`).
- Capabilities: list users, change plan, suspend/restore, delete user and related data.
- On login, superadmin is redirected to `/superadmin` and blocked from `/dashboard`.
- Superadmin requester cannot execute scraping jobs.

### Suspension
- `profiles.is_suspended` and `profiles.suspended_at` define account state.
- Suspended users are blocked from running new scraping jobs.

### Secrets
- Backend runtime secrets: `APIFY_TOKEN`, `SUPERADMIN_EMAIL`.
- No private key or admin credentials are committed.

---

## 7. Main Flows

### Landing Flow
1. Hero section with core value proposition.
2. Testimonials section directly below hero for early social proof.
3. Problem, How it works, Pricing, FAQ, and CTA sections.

### Authentication Flow
1. User signs in with Email/Password or Google from `/auth`.
2. Frontend ensures `profiles/{uid}` and `subscriptions/{uid}` exist with starter defaults for new users.
3. Superadmin email is redirected to `/superadmin`; other users go to `/dashboard`.
4. Existing users keep current plan/quota state; missing identity fields are backfilled when needed.

### Lead Search Flow
1. User creates `searches` document with `queued` state.
2. Frontend calls `POST /api/run-apify-search` with Firebase ID token.
3. Backend validates auth, ownership, suspension, superadmin restriction, and quota.
4. Backend runs Apify (or demo mode if token missing).
5. Backend writes leads and updates profile usage.
6. Dashboard updates in realtime via Firestore snapshot listeners.

### Superadmin Flow
1. Authorized user enters `/superadmin`.
2. Frontend calls `POST /api/superadmin-users` with Firebase ID token.
3. Superadmin can execute plan updates, suspend/restore, or hard delete.
4. Superadmin UI does not show a dashboard shortcut and surfaces a clear service-unavailable message if backend is unreachable.

---

## 8. Environment Variables

### Frontend (`.env`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_BACKEND_API_URL` (required)
- `VITE_SUPERADMIN_EMAIL` (optional frontend guard override)
- `VITE_PAYPAL_STARTER_URL` (optional)
- `VITE_PAYPAL_GROWTH_URL` (optional)
- `VITE_PAYPAL_PRO_URL` (optional)

### Backend runtime (`map-leads-backend`)
- `SUPERADMIN_EMAIL` (optional; default allowlist email)
- `APIFY_TOKEN` (optional; without it app runs in demo mode)

---

## 9. Current Assumptions

1. Cloud Run backend is deployed and reachable from frontend origin.
2. Apify actor remains available and stable.
3. Firestore indexes from `firestore.indexes.json` are deployed.
4. Billing remains frontend-driven through PayPal links.
5. Team workspaces and enterprise access control are out of scope.
