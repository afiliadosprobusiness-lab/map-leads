# MapLeads - API and Data Contract

> **Version:** 1.1.0
> **Status:** MVP - Source of mechanical truth
> **Last updated:** 2026-02-18

---

## Contract Rules

1. This document is the source of mechanical truth for frontend, Firebase Functions, and Firestore.
2. Breaking changes require explicit version bump.
3. Added fields must be backward compatible whenever possible.

---

## 1. Firebase Callable Functions

All functions are callable via Firebase SDK and require authenticated user context.

### 1.1 `runApifySearch`

Triggers one scraping job for an existing search.

#### Request

```json
{
  "search_id": "documentId"
}
```

#### Success Response

```json
{
  "success": true,
  "mode": "live | demo",
  "leads": 142
}
```

#### Error Codes (`HttpsError.code`)

| Code | Condition |
|---|---|
| `invalid-argument` | Missing/invalid `search_id` |
| `unauthenticated` | Missing auth context |
| `not-found` | Search does not exist or does not belong to caller |
| `permission-denied` | Suspended account |
| `resource-exhausted` | Leads quota exceeded |
| `internal` | Apify/Firestore/unexpected error |

#### Side Effects

- Updates search lifecycle (`queued -> running -> completed/failed`)
- Inserts leads in Firestore
- Increments `profiles.leads_used`
- Attempts email enrichment for `growth` and `pro`

---

### 1.2 `superadminUsers`

Restricted superadmin user management callable.

#### Authorization

- Caller must be authenticated.
- Caller email must match `SUPERADMIN_EMAIL` (default: `afiliadosprobusiness@gmail.com`).

#### Request

```json
{
  "action": "list_users | set_plan | suspend_user | restore_user | delete_user",
  "user_id": "uid",
  "plan": "starter | growth | pro",
  "query": "optional text",
  "limit": 500
}
```

#### Success Responses

- `list_users`:

```json
{
  "users": [
    {
      "id": "uid",
      "email": "user@example.com",
      "full_name": "User Name",
      "plan": "starter",
      "leads_used": 0,
      "leads_limit": 2000,
      "is_suspended": false,
      "suspended_at": null,
      "created_at": "2026-02-18T00:00:00.000Z",
      "updated_at": "2026-02-18T00:00:00.000Z"
    }
  ]
}
```

- other actions:

```json
{
  "success": true
}
```

#### Error Codes (`HttpsError.code`)

| Code | Condition |
|---|---|
| `invalid-argument` | Invalid action/args |
| `unauthenticated` | Missing auth context |
| `permission-denied` | Non-superadmin caller |
| `internal` | Firebase Auth / Firestore errors |

---

## 2. Firestore Data Model (Contract Minimum)

### 2.1 `profiles/{uid}`

```json
{
  "id": "uid",
  "email": "user@example.com",
  "full_name": "User Name",
  "plan": "starter | growth | pro",
  "leads_used": 0,
  "leads_limit": 2000,
  "stripe_customer_id": null,
  "is_suspended": false,
  "suspended_at": null,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### 2.2 `searches/{searchId}`

```json
{
  "user_id": "uid",
  "keyword": "restaurants",
  "city": "Barcelona",
  "country": "Spain",
  "max_results": 100,
  "status": "queued | running | completed | failed",
  "total_results": 0,
  "apify_run_id": null,
  "error_message": null,
  "created_at": "ISO-8601 or server timestamp",
  "updated_at": "ISO-8601 or server timestamp"
}
```

### 2.3 `leads/{leadId}`

```json
{
  "search_id": "searchId",
  "user_id": "uid",
  "business_name": "Business",
  "address": "Address",
  "phone": "+1...",
  "website": "https://...",
  "email": null,
  "rating": 4.5,
  "reviews_count": 120,
  "category": "Restaurant",
  "latitude": null,
  "longitude": null,
  "created_at": "ISO-8601"
}
```

### 2.4 `subscriptions/{uid}`

```json
{
  "user_id": "uid",
  "plan": "starter | growth | pro",
  "status": "active",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Legacy Stripe fields are kept only for backward compatibility.

---

## 3. Frontend Contracted Calls

### 3.1 Create Search

```ts
addDoc(collection(db, "searches"), {
  user_id,
  keyword,
  city,
  country,
  max_results,
  status: "queued",
  total_results: 0
})
```

### 3.2 Trigger Scraping

```ts
httpsCallable(functions, "runApifySearch")({ search_id })
```

### 3.3 Superadmin Operations

```ts
httpsCallable(functions, "superadminUsers")({
  action,
  user_id,
  plan,
  query,
  limit,
})
```

### 3.4 CSV Export

Column order is fixed:

`Business Name, Address, Phone, Website, Email, Category, Rating`

Filename:

`mapleads-{keyword}-{city}.csv`

---

## 4. Firestore Security Summary

- `profiles`: owner read, owner create with starter defaults, no client update/delete
- `searches`: owner read, owner create queued searches, no client update/delete
- `leads`: owner read only
- `subscriptions`: owner read only
- Superadmin mutations run server-side in callable functions

---

## Changelog del Contrato

- 2026-02-18
  - Cambio: Migration from Supabase contract to Firebase Auth + Firestore + Callable Functions.
  - Tipo: breaking
  - Impacto: Backend provider switched; all direct Supabase calls replaced by Firebase SDK calls.
- 2026-02-18
  - Cambio: Added callable `superadminUsers` and suspended-account guard in `runApifySearch`.
  - Tipo: non-breaking (within Firebase contract)
  - Impacto: Enables secure superadmin operations and account suspension enforcement.
