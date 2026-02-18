import { auth } from "@/lib/firebase";
import { PlanType } from "@/types/app";

export interface SuperadminListUsersPayload {
  action: "list_users";
  query?: string;
  limit?: number;
}

export interface SuperadminMutationPayload {
  action: "set_plan" | "suspend_user" | "restore_user" | "delete_user";
  user_id: string;
  plan?: PlanType;
}

type ApiErrorResponse = {
  error?: string;
};

const API_BASE_URL = ((import.meta.env.VITE_BACKEND_API_URL ?? "").trim() || (import.meta.env.DEV ? "http://localhost:8080" : "")).replace(/\/+$/, "");

function ensureApiBaseUrl(): string {
  if (API_BASE_URL) return API_BASE_URL;
  throw new Error("VITE_BACKEND_API_URL is not configured");
}

async function readJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function postApi<TPayload extends Record<string, unknown>, TResult>(path: string, payload: TPayload): Promise<TResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Unauthorized");
  }

  const token = await user.getIdToken();
  const response = await fetch(`${ensureApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await readJsonSafe(response)) as ApiErrorResponse | TResult | null;
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (body ?? {}) as TResult;
}

export async function invokeRunApifySearch(search_id: string) {
  return postApi<{ search_id: string }, { success: boolean; mode?: "demo" | "live"; leads?: number }>(
    "/api/run-apify-search",
    { search_id },
  );
}

export async function invokeSuperadminUsers(payload: SuperadminListUsersPayload | SuperadminMutationPayload) {
  return postApi<SuperadminListUsersPayload | SuperadminMutationPayload, Record<string, unknown>>(
    "/api/superadmin-users",
    payload,
  );
}
