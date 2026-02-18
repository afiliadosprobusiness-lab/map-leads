# MapLeads — Product Context

> **Version:** 1.0.0  
> **Last updated:** 2026-02-18  
> **Status:** MVP

---

## 1. Product Objective

MapLeads is a global B2B SaaS platform that enables sales teams, freelancers, and marketing agencies to extract structured business leads from Google Maps using Apify as the scraping engine.

The core value proposition:
- Search any keyword + city + country combination
- Receive structured lead data (name, phone, address, website, email) in minutes
- Export to CSV for immediate use in CRMs or outreach tools
- No code, no manual work, no geographic restrictions

---

## 2. Target User

| Segment | Description |
|---|---|
| **Primary** | Sales reps and SDRs at SMBs needing local business lists |
| **Secondary** | Freelance lead generation specialists and growth hackers |
| **Tertiary** | Digital marketing agencies running outreach campaigns for clients |

**User persona:**  
> "I need 200 dentists in Miami with phone numbers by tomorrow morning."

**Not targeted:**  
- Enterprise data teams (they have internal pipelines)  
- Developers wanting raw API access (v2 roadmap)  
- B2C consumer data (out of scope entirely)

---

## 3. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + custom design tokens |
| Routing | React Router v6 |
| State | React Context (Auth, Language) |
| Data fetching | TanStack Query v5 |
| UI Components | shadcn/ui (Radix primitives) |
| Fonts | Space Grotesk (headings) + Inter (body) |

### Backend
| Layer | Technology |
|---|---|
| Platform | Lovable Cloud (Supabase-powered) |
| Database | PostgreSQL (managed) |
| Auth | Supabase Auth (email/password) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Realtime | Supabase Realtime (postgres_changes) |
| Scraping engine | Apify — actor: `compass~crawler-google-places` |

### Infrastructure
| Layer | Technology |
|---|---|
| Hosting | Vercel (frontend) / Lovable Cloud (backend) |
| Payments | Stripe (subscriptions + webhooks) |
| Secrets | Lovable Cloud Secrets Manager |
| Email enrichment | Custom fetch scraper (Growth/Pro only) |

---

## 4. General Architecture

```
┌──────────────────────────────────────────────────────┐
│                     React SPA                        │
│  Landing Page │ Auth │ Dashboard │ Billing           │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────┐
│              Supabase (Lovable Cloud)                 │
│                                                       │
│  ┌─────────────┐  ┌─────────────────────────────┐   │
│  │  Auth (JWT) │  │      PostgreSQL DB            │   │
│  └─────────────┘  │  profiles │ searches │ leads  │   │
│                   │  subscriptions │ user_roles    │   │
│  ┌─────────────┐  └─────────────────────────────┘   │
│  │ Edge Funcs  │                                     │
│  │  - run-apify-search                               │
│  │  - stripe-webhook  (planned)                      │
│  │  - reset-monthly-quota (planned, cron)            │
│  └──────┬──────┘                                     │
└─────────┼──────────────────────────────────────────-─┘
          │ HTTPS + token
┌─────────▼──────────┐     ┌──────────────────────┐
│   Apify API        │     │   Stripe API          │
│ Google Maps Scraper│     │ Subscriptions/Webhooks│
└────────────────────┘     └──────────────────────┘
```

### Data flow for a search:
1. User submits search form → POST to `searches` table (status: `queued`)
2. Frontend calls Edge Function `run-apify-search` with `search_id`
3. Edge Function validates quota → updates status to `running`
4. Edge Function calls Apify actor and waits up to 300s
5. Results are parsed → inserted into `leads` table
6. `searches.status` updated to `completed`, `total_results` set
7. `profiles.leads_used` incremented
8. Frontend receives realtime update via Supabase channel
9. If plan >= Growth: email enrichment runs on leads with websites

---

## 5. Security Rules

### Authentication
- All dashboard routes require a valid Supabase JWT
- Edge Functions validate JWT via `supabase.auth.getUser(token)`
- No client-side role checks used for access control — server always validates
- `verify_jwt = false` in config.toml is intentional; manual validation is done inside the function

### Database (Row Level Security)
- **RLS is enabled on all tables** — no exceptions
- Users can only SELECT/INSERT/UPDATE their own rows (filtered by `auth.uid()`)
- `user_roles` table is separate from `profiles` to prevent privilege escalation
- A `security definer` function `has_role()` is used for role checks to avoid RLS recursion
- No direct `auth.users` table queries from the client

### Secrets
- `APIFY_TOKEN` stored as Lovable Cloud secret — never exposed to the frontend
- `STRIPE_SECRET_KEY` stored as Lovable Cloud secret — never exposed to the frontend
- `SUPABASE_SERVICE_ROLE_KEY` used only inside Edge Functions
- No API keys in source code or version control

### Input Validation
- All user inputs validated client-side (length, type, required)
- Edge Functions re-validate all inputs server-side before processing
- `max_results` capped at `min(500, leadsLimit - leadsUsed)`
- SQL injection not possible — Supabase client uses parameterized queries exclusively

### Rate Limiting
- Quota system acts as a functional rate limit (leads_used vs leads_limit)
- No more than one active Apify run per search_id
- Edge Function returns 429 if quota is exhausted

---

## 6. Plans & Quotas Model

| Plan | Price | Leads/month | Email Enrichment | Recurring Searches |
|---|---|---|---|---|
| `starter` | $49/mo | 2,000 | ❌ | ❌ |
| `growth` | $99/mo | 5,000 | ✅ | ❌ |
| `pro` | $199/mo | 15,000 | ✅ | ✅ |

### Quota rules:
- `profiles.leads_used` tracks consumed leads in the current period
- `profiles.leads_limit` is set based on active plan (2000 / 5000 / 15000)
- `profiles.plan_reset_at` marks when the counter resets (monthly, aligned to billing period)
- Quota reset is triggered by Stripe webhook on `invoice.paid` event
- If a search would exceed quota, it is rejected at the Edge Function level with HTTP 429
- `leads_used` is incremented only after leads are successfully inserted

### Downgrade behavior:
- On downgrade, `leads_limit` is reduced immediately
- Existing stored leads are retained — never deleted on downgrade
- Ongoing searches at time of downgrade complete normally

---

## 7. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scraping engine | Apify `compass~crawler-google-places` | Maintained actor, handles Google anti-bot measures |
| Waiting strategy | `waitForFinish=300` in Apify call | Synchronous simplicity for MVP; async polling in v2 |
| Email enrichment | Fetch + regex on website HTML | No third-party dependency for MVP; acceptable for <20 leads/search |
| Auth | Email/password only | Fastest to implement; OAuth providers are v2 |
| Realtime | Supabase postgres_changes | Native, zero extra infra; scales to 300 concurrent users |
| Language | EN default, ES supported | Target market is global English-first, with LATAM as secondary |
| CSV export | Client-side Blob generation | No server round-trip needed; simpler and faster |
| Demo mode | Mock data when `APIFY_TOKEN` absent | Enables full UX testing without Apify costs |

---

## 8. Current Assumptions

1. **Google Maps data is public** — scraping it does not violate any law when used for B2B commercial contact under the user's responsibility.
2. **Apify actor stability** — `compass~crawler-google-places` is assumed stable; actor ID changes would require an update to the Edge Function.
3. **Single region** — Lovable Cloud is deployed in a single region; latency is acceptable for the MVP user base.
4. **300 concurrent users** — current architecture handles this with no changes; Apify runs are the bottleneck (external service).
5. **Email enrichment accuracy** — regex-based extraction has ~40-60% hit rate; acceptable for MVP.
6. **Stripe as sole payment processor** — no alternative payment methods in v1.
7. **No multi-tenancy / teams** — each account is individual; team workspaces are v2.
8. **No GDPR compliance automation** — the user is responsible for data handling; MapLeads provides the tool, not legal advice.
9. **Search results are append-only** — leads are never auto-deleted; the user manages their own data.
10. **Apify timeout is 300s** — searches returning >500 results may hit this limit; `max_results` cap of 500 mitigates this.
