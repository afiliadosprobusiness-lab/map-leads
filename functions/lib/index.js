"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.superadminUsers = exports.runApifySearch = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const adminAuth = (0, auth_1.getAuth)();
const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL ?? "afiliadosprobusiness@gmail.com").toLowerCase();
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = "compass~crawler-google-places";
const PLAN_LIMITS = {
    starter: 2000,
    growth: 5000,
    pro: 15000,
};
function nowIso() {
    return new Date().toISOString();
}
function chunkArray(items, chunkSize) {
    const chunks = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}
function ensureAuthenticatedUser(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Unauthorized");
    }
    return request.auth;
}
function ensureSuperadmin(request) {
    const authData = ensureAuthenticatedUser(request);
    const email = authData.token.email?.toLowerCase() ?? "";
    if (email !== SUPERADMIN_EMAIL) {
        throw new https_1.HttpsError("permission-denied", "Forbidden");
    }
    return authData;
}
function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    return null;
}
function asStringOrNull(value) {
    if (typeof value === "string" && value.trim().length > 0)
        return value;
    return null;
}
async function writeLeadsAndFinalize(userId, searchId, leads, currentLeadsUsed) {
    const profileRef = db.collection("profiles").doc(userId);
    const searchRef = db.collection("searches").doc(searchId);
    if (leads.length === 0) {
        await searchRef.set({
            status: "completed",
            total_results: 0,
            error_message: null,
            updated_at: nowIso(),
        }, { merge: true });
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
            batch.set(searchRef, {
                status: "completed",
                total_results: leads.length,
                error_message: null,
                updated_at: nowIso(),
            }, { merge: true });
            batch.set(profileRef, {
                leads_used: currentLeadsUsed + leads.length,
                updated_at: nowIso(),
            }, { merge: true });
        }
        await batch.commit();
    }
}
async function maybeEnrichEmails(plan, searchId, leads) {
    if (plan !== "growth" && plan !== "pro")
        return;
    const candidates = leads.filter((lead) => lead.website && !lead.email).slice(0, 20);
    for (const lead of candidates) {
        try {
            const response = await fetch(lead.website, { signal: AbortSignal.timeout(5000) });
            const html = await response.text();
            const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (!emailMatch)
                continue;
            const leadSnapshot = await db
                .collection("leads")
                .where("search_id", "==", searchId)
                .where("website", "==", lead.website)
                .limit(1)
                .get();
            if (leadSnapshot.empty)
                continue;
            await leadSnapshot.docs[0].ref.set({ email: emailMatch[0] }, { merge: true });
        }
        catch {
            // Ignore enrichment errors
        }
    }
}
function buildMockLeads(search) {
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
function normalizeApifyLeads(items) {
    return items.map((raw) => {
        const item = (raw ?? {});
        const location = (item.location ?? {});
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
async function deleteByUserId(collectionName, userId) {
    while (true) {
        const snapshot = await db.collection(collectionName).where("user_id", "==", userId).limit(400).get();
        if (snapshot.empty)
            break;
        const batch = db.batch();
        snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
        await batch.commit();
        if (snapshot.size < 400)
            break;
    }
}
exports.runApifySearch = (0, https_1.onCall)({
    timeoutSeconds: 540,
    memory: "1GiB",
}, async (request) => {
    const authData = ensureAuthenticatedUser(request);
    const userId = authData.uid;
    const requesterEmail = authData.token.email?.toLowerCase() ?? "";
    const searchId = request.data.search_id;
    if (requesterEmail === SUPERADMIN_EMAIL) {
        throw new https_1.HttpsError("permission-denied", "Superadmin cannot run searches");
    }
    if (!searchId || typeof searchId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "search_id required");
    }
    const searchRef = db.collection("searches").doc(searchId);
    try {
        const searchSnapshot = await searchRef.get();
        if (!searchSnapshot.exists) {
            throw new https_1.HttpsError("not-found", "Search not found");
        }
        const search = searchSnapshot.data();
        if (search.user_id !== userId) {
            throw new https_1.HttpsError("not-found", "Search not found");
        }
        const profileRef = db.collection("profiles").doc(userId);
        const profileSnapshot = await profileRef.get();
        if (!profileSnapshot.exists) {
            throw new https_1.HttpsError("failed-precondition", "Profile not found");
        }
        const profile = profileSnapshot.data();
        const leadsUsed = profile.leads_used ?? 0;
        const leadsLimit = profile.leads_limit ?? 2000;
        const plan = profile.plan ?? "starter";
        if (profile.is_suspended) {
            await searchRef.set({
                status: "failed",
                error_message: "Account suspended",
                updated_at: nowIso(),
            }, { merge: true });
            throw new https_1.HttpsError("permission-denied", "Account suspended");
        }
        if (leadsUsed >= leadsLimit) {
            await searchRef.set({
                status: "failed",
                error_message: "Leads quota exceeded",
                updated_at: nowIso(),
            }, { merge: true });
            throw new https_1.HttpsError("resource-exhausted", "Leads quota exceeded");
        }
        await searchRef.set({
            status: "running",
            error_message: null,
            updated_at: nowIso(),
        }, { merge: true });
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
            throw new https_1.HttpsError("internal", `Apify error [${apifyResponse.status}]: ${details}`);
        }
        const apifyRun = (await apifyResponse.json());
        if (apifyRun.data?.id) {
            await searchRef.set({ apify_run_id: apifyRun.data.id, updated_at: nowIso() }, { merge: true });
        }
        if (!apifyRun.data?.defaultDatasetId) {
            await searchRef.set({
                status: "completed",
                total_results: 0,
                updated_at: nowIso(),
            }, { merge: true });
            return { success: true, mode: "live", leads: 0 };
        }
        const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${apifyRun.data.defaultDatasetId}/items?token=${APIFY_TOKEN}&format=json`);
        const items = (await datasetResponse.json());
        const normalizedLeads = Array.isArray(items) ? normalizeApifyLeads(items) : [];
        await writeLeadsAndFinalize(userId, searchId, normalizedLeads, leadsUsed);
        await maybeEnrichEmails(plan, searchId, normalizedLeads);
        return {
            success: true,
            mode: "live",
            leads: normalizedLeads.length,
        };
    }
    catch (error) {
        const message = error instanceof https_1.HttpsError ? error.message : error instanceof Error ? error.message : "Unexpected error";
        logger.error("runApifySearch failed", { searchId, userId, message });
        await searchRef.set({
            status: "failed",
            error_message: message,
            updated_at: nowIso(),
        }, { merge: true });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", message);
    }
});
exports.superadminUsers = (0, https_1.onCall)({
    timeoutSeconds: 300,
    memory: "512MiB",
}, async (request) => {
    const requester = ensureSuperadmin(request);
    const action = request.data.action;
    if (!action) {
        throw new https_1.HttpsError("invalid-argument", "action is required");
    }
    if (action === "list_users") {
        const searchQuery = (request.data.query ?? "").trim().toLowerCase();
        const limitValue = Math.min(Math.max(Number(request.data.limit ?? 200), 1), 1000);
        const profilesSnapshot = await db.collection("profiles").orderBy("created_at", "desc").limit(limitValue).get();
        const users = profilesSnapshot.docs
            .map((docSnapshot) => {
            const profile = docSnapshot.data();
            return {
                id: docSnapshot.id,
                email: profile.email ?? "",
                full_name: profile.full_name ?? null,
                plan: profile.plan ?? "starter",
                leads_used: profile.leads_used ?? 0,
                leads_limit: profile.leads_limit ?? 2000,
                is_suspended: profile.is_suspended ?? false,
                suspended_at: profile.suspended_at ?? null,
                created_at: docSnapshot.data().created_at ?? "",
                updated_at: docSnapshot.data().updated_at ?? "",
            };
        })
            .filter((user) => {
            if (!searchQuery)
                return true;
            return user.email.toLowerCase().includes(searchQuery) || (user.full_name ?? "").toLowerCase().includes(searchQuery);
        });
        return { users };
    }
    const userId = request.data.user_id;
    if (!userId || typeof userId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid user_id is required");
    }
    if (action === "set_plan") {
        const plan = request.data.plan;
        if (!plan || !(plan in PLAN_LIMITS)) {
            throw new https_1.HttpsError("invalid-argument", "Valid plan is required");
        }
        const now = nowIso();
        await db.collection("profiles").doc(userId).set({
            plan,
            leads_limit: PLAN_LIMITS[plan],
            updated_at: now,
        }, { merge: true });
        await db.collection("subscriptions").doc(userId).set({
            user_id: userId,
            plan,
            updated_at: now,
            created_at: now,
        }, { merge: true });
        return { success: true };
    }
    if (action === "suspend_user") {
        if (userId === requester.uid) {
            throw new https_1.HttpsError("invalid-argument", "You cannot suspend your own account");
        }
        await db.collection("profiles").doc(userId).set({
            is_suspended: true,
            suspended_at: nowIso(),
            updated_at: nowIso(),
        }, { merge: true });
        await adminAuth.updateUser(userId, { disabled: true });
        return { success: true };
    }
    if (action === "restore_user") {
        await db.collection("profiles").doc(userId).set({
            is_suspended: false,
            suspended_at: null,
            updated_at: nowIso(),
        }, { merge: true });
        await adminAuth.updateUser(userId, { disabled: false });
        return { success: true };
    }
    if (action === "delete_user") {
        if (userId === requester.uid) {
            throw new https_1.HttpsError("invalid-argument", "You cannot delete your own account");
        }
        await deleteByUserId("leads", userId);
        await deleteByUserId("searches", userId);
        await db.collection("subscriptions").doc(userId).delete().catch(() => undefined);
        await db.collection("profiles").doc(userId).delete().catch(() => undefined);
        await adminAuth.deleteUser(userId);
        return { success: true };
    }
    throw new https_1.HttpsError("invalid-argument", "Unknown action");
});
//# sourceMappingURL=index.js.map