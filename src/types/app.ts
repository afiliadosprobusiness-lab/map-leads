export type PlanType = "starter" | "growth" | "pro";
export type SearchStatus = "queued" | "running" | "completed" | "failed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: PlanType;
  leads_used: number;
  leads_limit: number;
  stripe_customer_id: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SearchRecord {
  id: string;
  user_id: string;
  keyword: string;
  city: string;
  country: string;
  max_results: number;
  status: SearchStatus;
  total_results: number;
  error_message?: string | null;
  apify_run_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  search_id: string;
  user_id: string;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  category: string | null;
  reviews_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
}
