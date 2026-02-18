# MapLeads — API & Data Contract

> **Version:** 1.0.0  
> **Status:** MVP — Source of mechanical truth  
> **Last updated:** 2026-02-18

---

## Contract Rules

1. **This document is the source of mechanical truth.** All backend logic, frontend calls, and database schemas must conform to what is defined here.
2. **No breaking changes without version bump.** Removing a field, renaming a field, or changing a field's type constitutes a breaking change and requires incrementing the contract version.
3. **New fields must be optional.** Any field added to a request or response must have a default value or be explicitly marked as optional (`?`). Required fields cannot be added to existing endpoints without a version bump.
4. **No ambiguous logic.** All rules expressed in this contract are deterministic. "It depends" is not a valid contract clause.
5. **HTTP status codes are part of the contract.** Changing a success code (e.g., 200 → 201) or error code is a breaking change.

---

## Versioning Policy

- Current version: **v1**
- Version is tracked in this file header and in `X-Contract-Version` response header on all Edge Functions
- Breaking changes → bump minor: `1.0.0` → `1.1.0`
- New optional fields → bump patch: `1.0.0` → `1.0.1`
- Incompatible changes → bump major: `1.0.0` → `2.0.0` (new base path `/v2/`)
- Deprecated fields must be marked in this document for ≥ 1 full billing cycle before removal

---

## 1. Edge Functions

### 1.1 `POST /functions/v1/run-apify-search`

Triggers a Google Maps scraping job for a given search record.

#### Authentication
```
Authorization: Bearer <supabase_jwt>
```
JWT is validated server-side. Requests without a valid JWT return `401`.

#### Request

```json
{
  "search_id": "uuid"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `search_id` | `string (UUID)` | ✅ | ID of an existing `searches` record owned by the authenticated user |

#### Response — Success `200`

```json
{
  "success": true,
  "mode": "live | demo",
  "leads": 142
}
```

| Field | Type | Always present | Description |
|---|---|---|---|
| `success` | `boolean` | ✅ | Always `true` on 200 |
| `mode` | `"live" \| "demo"` | ✅ | `"demo"` when `APIFY_TOKEN` is not configured |
| `leads` | `integer` | ✅ | Number of leads inserted into the `leads` table |

#### Response — Error Codes

| HTTP Code | Condition | Body |
|---|---|---|
| `400` | `search_id` missing or malformed | `{ "error": "search_id required" }` |
| `401` | Missing or invalid JWT | `{ "error": "Unauthorized" }` or `{ "error": "Invalid token" }` |
| `404` | `search_id` not found or does not belong to authenticated user | `{ "error": "Search not found" }` |
| `429` | User quota exhausted (`leads_used >= leads_limit`) | `{ "error": "Leads quota exceeded" }` |
| `500` | Apify error, DB error, or unexpected exception | `{ "error": "<message>" }` |

#### Side effects (guaranteed on `200`)
- `searches.status` updated: `queued` → `running` → `completed`
- `leads` rows inserted for the given `search_id`
- `profiles.leads_used` incremented by the number of leads inserted
- If plan is `growth` or `pro`: email enrichment attempted on leads with a `website` value

#### Side effects (guaranteed on `429`)
- `searches.status` updated to `failed`
- `searches.error_message` set to `"Cuota de leads agotada"`
- No leads inserted

---

## 2. Database Schema (Minimum Viable)

All tables live in the `public` schema. UUIDs use `gen_random_uuid()` as default.

---

### 2.1 `profiles`

Stores extended user data. Created automatically via trigger on `auth.users` insert.

```sql
CREATE TABLE public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  full_name         TEXT,
  stripe_customer_id TEXT,
  plan              plan_type   NOT NULL DEFAULT 'starter',
  leads_used        INTEGER     NOT NULL DEFAULT 0,
  leads_limit       INTEGER     NOT NULL DEFAULT 2000,
  plan_reset_at     TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID | ❌ | — | FK → auth.users |
| `email` | TEXT | ❌ | — | Copied from auth.users on creation |
| `full_name` | TEXT | ✅ | NULL | User-provided at signup |
| `stripe_customer_id` | TEXT | ✅ | NULL | Set by Stripe webhook |
| `plan` | plan_type | ❌ | `starter` | Enum: `starter`, `growth`, `pro` |
| `leads_used` | INTEGER | ❌ | `0` | Reset monthly |
| `leads_limit` | INTEGER | ❌ | `2000` | Set by plan: 2000/5000/15000 |
| `plan_reset_at` | TIMESTAMPTZ | ❌ | next month | Set by Stripe webhook on invoice.paid |
| `created_at` | TIMESTAMPTZ | ❌ | now() | — |
| `updated_at` | TIMESTAMPTZ | ❌ | now() | Auto-updated by trigger |

**Plan → limits mapping (authoritative):**

| plan | leads_limit |
|---|---|
| `starter` | 2000 |
| `growth` | 5000 |
| `pro` | 15000 |

---

### 2.2 `searches`

Each row represents one scraping job.

```sql
CREATE TABLE public.searches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword         TEXT        NOT NULL,
  city            TEXT        NOT NULL,
  country         TEXT        NOT NULL,
  max_results     INTEGER     NOT NULL DEFAULT 100,
  status          TEXT        NOT NULL DEFAULT 'queued',
  total_results   INTEGER     NOT NULL DEFAULT 0,
  apify_run_id    TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Constraints | Notes |
|---|---|---|---|---|
| `id` | UUID | ❌ | PK | — |
| `user_id` | UUID | ❌ | FK → auth.users | RLS filter column |
| `keyword` | TEXT | ❌ | max 100 chars | e.g. "restaurants" |
| `city` | TEXT | ❌ | max 100 chars | e.g. "Barcelona" |
| `country` | TEXT | ❌ | max 100 chars | e.g. "Spain" |
| `max_results` | INTEGER | ❌ | 10–500 | Capped at min(500, quota remaining) |
| `status` | TEXT | ❌ | CHECK IN ('queued','running','completed','failed') | Lifecycle state |
| `total_results` | INTEGER | ❌ | ≥ 0 | Set after completion |
| `apify_run_id` | TEXT | ✅ | — | Apify run ID for debugging |
| `error_message` | TEXT | ✅ | — | Human-readable error on failure |
| `created_at` | TIMESTAMPTZ | ❌ | — | — |
| `updated_at` | TIMESTAMPTZ | ❌ | — | Auto-updated by trigger |

**Status lifecycle (linear — no backward transitions):**
```
queued → running → completed
queued → running → failed
```

---

### 2.3 `leads`

Each row is a single business extracted from a search.

```sql
CREATE TABLE public.leads (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id       UUID          NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name   TEXT,
  address         TEXT,
  phone           TEXT,
  website         TEXT,
  email           TEXT,
  rating          NUMERIC(2,1),
  reviews_count   INTEGER,
  category        TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | ❌ | PK |
| `search_id` | UUID | ❌ | FK → searches (cascade delete) |
| `user_id` | UUID | ❌ | FK → auth.users (RLS filter) |
| `business_name` | TEXT | ✅ | May be null if Apify returns no name |
| `address` | TEXT | ✅ | Full address string |
| `phone` | TEXT | ✅ | Raw string, not normalized |
| `website` | TEXT | ✅ | Full URL including scheme |
| `email` | TEXT | ✅ | Set by enrichment if plan >= growth |
| `rating` | NUMERIC(2,1) | ✅ | 0.0–5.0 |
| `reviews_count` | INTEGER | ✅ | Google Maps review count |
| `category` | TEXT | ✅ | First category from Apify |
| `latitude` | NUMERIC(10,7) | ✅ | — |
| `longitude` | NUMERIC(10,7) | ✅ | — |
| `created_at` | TIMESTAMPTZ | ❌ | — |

---

### 2.4 `subscriptions`

Mirrors Stripe subscription state. Updated by the Stripe webhook.

```sql
CREATE TABLE public.subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id   TEXT        UNIQUE,
  stripe_customer_id       TEXT,
  plan                     plan_type   NOT NULL DEFAULT 'starter',
  status                   TEXT        NOT NULL DEFAULT 'active',
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `user_id` | UUID | ❌ | UNIQUE — one subscription per user |
| `stripe_subscription_id` | TEXT | ✅ | Null until Stripe checkout completes |
| `status` | TEXT | ❌ | Mirrors Stripe: `active`, `canceled`, `past_due`, `trialing` |
| `plan` | plan_type | ❌ | Source of truth for billing; synced with `profiles.plan` |

---

### 2.5 `user_roles`

Separate from profiles to prevent privilege escalation.

```sql
CREATE TABLE public.user_roles (
  id       UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     app_role  NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
```

**Enum `app_role`:** `'admin'`, `'user'`  
**Enum `plan_type`:** `'starter'`, `'growth'`, `'pro'`

---

## 3. Frontend → Supabase Direct Calls

These are not Edge Functions but direct Supabase client calls. They are still part of the contract.

### 3.1 Create a search

```typescript
supabase.from("searches").insert({
  user_id: string,      // required — must match auth.uid()
  keyword: string,      // required — max 100 chars
  city: string,         // required — max 100 chars
  country: string,      // required — max 100 chars
  max_results: number,  // required — integer 10–500
  status: "queued",     // required — always "queued" on creation
})
```

After insert, the client immediately calls `run-apify-search` with the returned `search_id`.

### 3.2 List searches

```typescript
supabase.from("searches")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(50)
```

Response type: `SearchRecord[]` (see Dashboard type definition).

### 3.3 List leads for a search

```typescript
supabase.from("leads")
  .select("*")
  .eq("search_id", searchId)
  .limit(500)
```

### 3.4 Get user profile

```typescript
supabase.from("profiles")
  .select("*")
  .eq("id", userId)
  .single()
```

---

## 4. CSV Export Format

Client-side export. Column order is fixed and part of the contract.

```
"Business Name","Address","Phone","Website","Email","Category","Rating"
"Restaurant XYZ","123 Main St, City","555-1234","https://xyz.com","info@xyz.com","Restaurant","4.5"
```

| Column | Source | Notes |
|---|---|---|
| Business Name | `leads.business_name` | Empty string if null |
| Address | `leads.address` | Empty string if null |
| Phone | `leads.phone` | Raw, not normalized |
| Website | `leads.website` | Full URL |
| Email | `leads.email` | From enrichment or empty |
| Category | `leads.category` | First category |
| Rating | `leads.rating` | String representation of NUMERIC |

Filename pattern: `mapleads-{keyword}-{city}.csv`

---

## 5. Planned Endpoints (v1.1 — Not Yet Implemented)

Listed here to reserve their signatures. No implementation is expected until these are formally added.

### `POST /functions/v1/stripe-webhook`
Receives Stripe events. Updates `subscriptions`, `profiles.plan`, `profiles.leads_limit`, `profiles.leads_used` (on reset), `profiles.plan_reset_at`.

Expected events:
- `checkout.session.completed` → create/update subscription
- `invoice.paid` → reset `leads_used` to 0, update `plan_reset_at`
- `customer.subscription.updated` → update plan
- `customer.subscription.deleted` → downgrade to `starter`

### `POST /functions/v1/reset-monthly-quota`
Cron-triggered (pg_cron). Resets `leads_used = 0` for all profiles where `plan_reset_at <= now()`.

### `GET /functions/v1/export-leads`
Server-side CSV generation for large result sets (>500 leads). Returns `text/csv` stream.

---

## 6. RLS Policies Summary

| Table | Operation | Policy |
|---|---|---|
| `profiles` | SELECT | `auth.uid() = id` |
| `profiles` | UPDATE | `auth.uid() = id` |
| `user_roles` | SELECT | `auth.uid() = user_id` |
| `searches` | SELECT | `auth.uid() = user_id` |
| `searches` | INSERT | `auth.uid() = user_id` |
| `searches` | UPDATE | `auth.uid() = user_id` |
| `leads` | SELECT | `auth.uid() = user_id` |
| `leads` | INSERT | `auth.uid() = user_id` |
| `subscriptions` | SELECT | `auth.uid() = user_id` |

> No table allows DELETE from the client.  
> Service role (Edge Functions only) bypasses RLS for internal operations.

---

## 7. Changelog

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-02-18 | Initial MVP contract — searches, leads, profiles, run-apify-search endpoint |
