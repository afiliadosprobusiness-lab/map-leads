import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
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

const runApifySearchCallable = httpsCallable<{ search_id: string }, { success: boolean; mode?: "demo" | "live"; leads?: number }>(
  functions,
  "runApifySearch",
);

const superadminUsersCallable = httpsCallable<SuperadminListUsersPayload | SuperadminMutationPayload, Record<string, unknown>>(
  functions,
  "superadminUsers",
);

export async function invokeRunApifySearch(search_id: string) {
  const response = await runApifySearchCallable({ search_id });
  return response.data;
}

export async function invokeSuperadminUsers(payload: SuperadminListUsersPayload | SuperadminMutationPayload) {
  const response = await superadminUsersCallable(payload);
  return response.data;
}
