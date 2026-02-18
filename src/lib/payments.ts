export type BillingPlan = "starter" | "growth" | "pro";

type FrontendEnv = {
  VITE_PAYPAL_STARTER_URL?: string;
  VITE_PAYPAL_GROWTH_URL?: string;
  VITE_PAYPAL_PRO_URL?: string;
};

export function getPayPalPlanUrl(plan: BillingPlan, env: FrontendEnv = import.meta.env): string | null {
  const map: Record<BillingPlan, string | undefined> = {
    starter: env.VITE_PAYPAL_STARTER_URL,
    growth: env.VITE_PAYPAL_GROWTH_URL,
    pro: env.VITE_PAYPAL_PRO_URL,
  };

  const url = map[plan]?.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
