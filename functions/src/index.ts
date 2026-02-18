import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();

const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? "afiliadosprobusiness@gmail.com").toLowerCase();
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "compass~crawler-google-places";

const PLAN_LIMITS = {
  starter: 2000,
  growth: 5000,
  pro: 15000,
} as const;

type PlanType = keyof typeof PLAN_LIMITS;
type SearchStatus = "queued" | "running" | "completed" | "failed";

interface SearchData {
  user_id: string;
  keyword: string;
  city: string;
  country: string;
  max_results: number;
  status: SearchStatus;
  total_results: number;
  error_message?: string | null;
}

interface ProfileData {
  email: string;
  full_name: string | null;
  plan: PlanType;
  leads_used: number;
  leads_limit: number;
  is_suspended: boolean;
  suspended_at: string | null;
}

interface LeadPayload {
  business_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  reviews_count: number | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RunSearchInput {
  search_id?: string;
}

interface SuperadminInput {
  action?: "list_users" | "set_plan" | "suspend_user" | "restore_user" | "delete_user";
  user_id?: string;
  plan?: PlanType;
  query?: string;
  limit?: number;
}

function nowIso() {
  return new Date().toISOString();
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function ensureAuthenticatedUser(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Unauthorized");
  }
  return request.auth;
}

function ensureSuperadmin(request: CallableRequest<unknown>) {
  const authData = ensureAuthenticatedUser(request);
  const email = (authData.token.email as string | undefined)?.toLowerCase() ?? "";
  if (email !== SUPERADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "Forbidden");
  }
  return authData;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}

async function writeLeadsAndFinalize(
  userId: string,
  searchId: string,
  leads: LeadPayload[],
  currentLeadsUsed: number,
): Promise<void> {
  const profileRef = db.collection("profiles").doc(userId);
  const searchRef = db.collection("searches").doc(searchId);

  if (leads.length === 0) {
    await searchRef.set(
      {
        status: "completed",
        total_results: 0,
        error_message: null,
        updated_at: nowIso(),
      },
      { merge: true },
    );
    return;
  }

  const chunks = chunkArray(leads, 400);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const batch = db.batch();

    for (const lead of chunk) {
      const leadRef = db.collection("leads").doc();
      batch.set(leadRef, {
        ...lead,
        user_id: userId,
        search_id: searchId,
        created_at: nowIso(),
      });
    }

    const isLastChunk = index === chunks.length - 1;
    if (isLastChunk) {
      batch.set(
        searchRef,
        {
          status: "completed",
          total_results: leads.length,
          error_message: null,
          updated_at: nowIso(),
        },
        { merge: true },
      );

      batch.set(
        profileRef,
        {
          leads_used: currentLeadsUsed + leads.length,
          updated_at: nowIso(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }
}

async function maybeEnrichEmails(plan: PlanType, searchId: string, leads: LeadPayload[]) {
  if (plan !== "growth" && plan !== "pro") return;

  const candidates = leads.filter((lead) => lead.website && !lead.email).slice(0, 20);

  for (const lead of candidates) {
    try {
      const response = await fetch(lead.website!, { signal: AbortSignal.timeout(5000) });
      const html = await response.text();
      const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (!emailMatch) continue;

      const leadSnapshot = await db
        .collection("leads")
        .where("search_id", "==", searchId)
        .where("website", "==", lead.website)
        .limit(1)
        .get();

      if (leadSnapshot.empty) continue;

      await leadSnapshot.docs[0].ref.set({ email: emailMatch[0] }, { merge: true });
    } catch {
      // Ignore enrichment errors
    }
  }
}

function buildMockLeads(search: SearchData): LeadPayload[] {
  const maxItems = Math.min(search.max_results || 100, 10);

  return Array.from({ length: maxItems }, (_, index) => ({
    business_name: `${search.keyword} ${index + 1} - ${search.city}`,
    address: `Main Street ${index + 1}, ${search.city}, ${search.country}`,
    phone: `+1 555 ${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
    website: `https://example${index + 1}.com`,
    email: null,
    rating: Number((3.2 + Math.random() * 1.6).toFixed(1)),
    reviews_count: Math.floor(Math.random() * 500),
    category: search.keyword,
    latitude: null,
    longitude: null,
  }));
}

function normalizeApifyLeads(items: unknown[]): LeadPayload[] {
  return items.map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const location = (item.location ?? {}) as Record<string, unknown>;
    const categories = Array.isArray(item.categories) ? item.categories : [];

    return {
      business_name: asStringOrNull(item.title),
      address: asStringOrNull(item.address),
      phone: asStringOrNull(item.phone),
      website: asStringOrNull(item.website),
      email: asStringOrNull(item.email),
      rating: parseNumber(item.totalScore),
      reviews_count: parseNumber(item.reviewsCount),
      category: asStringOrNull(categories[0]),
      latitude: parseNumber(location.lat),
      longitude: parseNumber(location.lng),
    };
  });
}

async function deleteByUserId(collectionName: string, userId: string) {
  while (true) {
    const snapshot = await db.collection(collectionName).where("user_id", "==", userId).limit(400).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
    await batch.commit();

    if (snapshot.size < 400) break;
  }
}

export const runApifySearch = onCall<RunSearchInput>(
  {
    timeoutSeconds: 540,
    memory: "1GiB",
    cors: true,
  },
  async (request) => {
    const authData = ensureAuthenticatedUser(request);
    const userId = authData.uid;
    const requesterEmail = (authData.token.email as string | undefined)?.toLowerCase() ?? "";
    const searchId = request.data.search_id;

    if (requesterEmail === SUPERADMIN_EMAIL) {
      throw new HttpsError("permission-denied", "Superadmin cannot run searches");
    }

    if (!searchId || typeof searchId !== "string") {
      throw new HttpsError("invalid-argument", "search_id required");
    }

    const searchRef = db.collection("searches").doc(searchId);

    try {
      const searchSnapshot = await searchRef.get();
      if (!searchSnapshot.exists) {
        throw new HttpsError("not-found", "Search not found");
      }

      const search = searchSnapshot.data() as SearchData;
      if (search.user_id !== userId) {
        throw new HttpsError("not-found", "Search not found");
      }

      const profileRef = db.collection("profiles").doc(userId);
      const profileSnapshot = await profileRef.get();
      if (!profileSnapshot.exists) {
        throw new HttpsError("failed-precondition", "Profile not found");
      }

      const profile = profileSnapshot.data() as ProfileData;
      const leadsUsed = profile.leads_used ?? 0;
      const leadsLimit = profile.leads_limit ?? 2000;
      const plan = (profile.plan as PlanType) ?? "starter";

      if (profile.is_suspended) {
        await searchRef.set(
          {
            status: "failed",
            error_message: "Account suspended",
            updated_at: nowIso(),
          },
          { merge: true },
        );
        throw new HttpsError("permission-denied", "Account suspended");
      }

      if (leadsUsed >= leadsLimit) {
        await searchRef.set(
          {
            status: "failed",
            error_message: "Leads quota exceeded",
            updated_at: nowIso(),
          },
          { merge: true },
        );
        throw new HttpsError("resource-exhausted", "Leads quota exceeded");
      }

      await searchRef.set(
        {
          status: "running",
          error_message: null,
          updated_at: nowIso(),
        },
        { merge: true },
      );

      if (!APIFY_TOKEN) {
        const mockLeads = buildMockLeads(search);
        await writeLeadsAndFinalize(userId, searchId, mockLeads, leadsUsed);
        return {
          success: true,
          mode: "demo",
          leads: mockLeads.length,
        };
      }

      const searchQuery = `${search.keyword} in ${search.city}, ${search.country}`;

      const apifyResponse = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=300`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: search.max_results,
          language: "en",
          exportPlaceUrls: false,
          includeHistogram: false,
          includeOpeningHours: false,
          includePeopleAlsoSearch: false,
        }),
      });

      if (!apifyResponse.ok) {
        const details = await apifyResponse.text();
        throw new HttpsError("internal", `Apify error [${apifyResponse.status}]: ${details}`);
      }

      const apifyRun = (await apifyResponse.json()) as {
        data?: {
          id?: string;
          defaultDatasetId?: string;
        };
      };

      if (apifyRun.data?.id) {
        await searchRef.set({ apify_run_id: apifyRun.data.id, updated_at: nowIso() }, { merge: true });
      }

      if (!apifyRun.data?.defaultDatasetId) {
        await searchRef.set(
          {
            status: "completed",
            total_results: 0,
            updated_at: nowIso(),
          },
          { merge: true },
        );
        return { success: true, mode: "live", leads: 0 };
      }

      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${apifyRun.data.defaultDatasetId}/items?token=${APIFY_TOKEN}&format=json`,
      );

      const items = (await datasetResponse.json()) as unknown[];
      const normalizedLeads = Array.isArray(items) ? normalizeApifyLeads(items) : [];

      await writeLeadsAndFinalize(userId, searchId, normalizedLeads, leadsUsed);
      await maybeEnrichEmails(plan, searchId, normalizedLeads);

      return {
        success: true,
        mode: "live",
        leads: normalizedLeads.length,
      };
    } catch (error) {
      const message = error instanceof HttpsError ? error.message : error instanceof Error ? error.message : "Unexpected error";
      logger.error("runApifySearch failed", { searchId, userId, message });

      await searchRef.set(
        {
          status: "failed",
          error_message: message,
          updated_at: nowIso(),
        },
        { merge: true },
      );

      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", message);
    }
  },
);

export const superadminUsers = onCall<SuperadminInput>(
  {
    timeoutSeconds: 300,
    memory: "512MiB",
    cors: true,
  },
  async (request) => {
    const requester = ensureSuperadmin(request);
    const action = request.data.action;

    if (!action) {
      throw new HttpsError("invalid-argument", "action is required");
    }

    if (action === "list_users") {
      const searchQuery = (request.data.query ?? "").trim().toLowerCase();
      const limitValue = Math.min(Math.max(Number(request.data.limit ?? 200), 1), 1000);

      const profilesSnapshot = await db.collection("profiles").orderBy("created_at", "desc").limit(limitValue).get();
      const users = profilesSnapshot.docs
        .map((docSnapshot) => {
          const profile = docSnapshot.data() as Partial<ProfileData>;
          return {
            id: docSnapshot.id,
            email: profile.email ?? "",
            full_name: profile.full_name ?? null,
            plan: profile.plan ?? "starter",
            leads_used: profile.leads_used ?? 0,
            leads_limit: profile.leads_limit ?? 2000,
            is_suspended: profile.is_suspended ?? false,
            suspended_at: profile.suspended_at ?? null,
            created_at: (docSnapshot.data().created_at as string | undefined) ?? "",
            updated_at: (docSnapshot.data().updated_at as string | undefined) ?? "",
          };
        })
        .filter((user) => {
          if (!searchQuery) return true;
          return user.email.toLowerCase().includes(searchQuery) || (user.full_name ?? "").toLowerCase().includes(searchQuery);
        });

      return { users };
    }

    const userId = request.data.user_id;
    if (!userId || typeof userId !== "string") {
      throw new HttpsError("invalid-argument", "Valid user_id is required");
    }

    if (action === "set_plan") {
      const plan = request.data.plan;
      if (!plan || !(plan in PLAN_LIMITS)) {
        throw new HttpsError("invalid-argument", "Valid plan is required");
      }

      const now = nowIso();
      await db.collection("profiles").doc(userId).set(
        {
          plan,
          leads_limit: PLAN_LIMITS[plan],
          updated_at: now,
        },
        { merge: true },
      );

      await db.collection("subscriptions").doc(userId).set(
        {
          user_id: userId,
          plan,
          updated_at: now,
          created_at: now,
        },
        { merge: true },
      );

      return { success: true };
    }

    if (action === "suspend_user") {
      if (userId === requester.uid) {
        throw new HttpsError("invalid-argument", "You cannot suspend your own account");
      }

      await db.collection("profiles").doc(userId).set(
        {
          is_suspended: true,
          suspended_at: nowIso(),
          updated_at: nowIso(),
        },
        { merge: true },
      );

      await adminAuth.updateUser(userId, { disabled: true });
      return { success: true };
    }

    if (action === "restore_user") {
      await db.collection("profiles").doc(userId).set(
        {
          is_suspended: false,
          suspended_at: null,
          updated_at: nowIso(),
        },
        { merge: true },
      );

      await adminAuth.updateUser(userId, { disabled: false });
      return { success: true };
    }

    if (action === "delete_user") {
      if (userId === requester.uid) {
        throw new HttpsError("invalid-argument", "You cannot delete your own account");
      }

      await deleteByUserId("leads", userId);
      await deleteByUserId("searches", userId);
      await db.collection("subscriptions").doc(userId).delete().catch(() => undefined);
      await db.collection("profiles").doc(userId).delete().catch(() => undefined);
      await adminAuth.deleteUser(userId);

      return { success: true };
    }

    throw new HttpsError("invalid-argument", "Unknown action");
  },
);
