import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ACTOR_ID = "compass~crawler-google-places";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { search_id } = body;

    if (!search_id) {
      return new Response(JSON.stringify({ error: "search_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch search record
    const { data: search, error: searchError } = await supabase
      .from("searches")
      .select("*")
      .eq("id", search_id)
      .eq("user_id", user.id)
      .single();

    if (searchError || !search) {
      return new Response(JSON.stringify({ error: "Search not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check quota
    const { data: profile } = await supabase
      .from("profiles")
      .select("leads_used, leads_limit, plan")
      .eq("id", user.id)
      .single();

    if (profile && profile.leads_used >= profile.leads_limit) {
      await supabase.from("searches").update({ status: "failed", error_message: "Cuota de leads agotada" }).eq("id", search_id);
      return new Response(JSON.stringify({ error: "Leads quota exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!APIFY_TOKEN) {
      // Demo mode: simulate a completed search with mock data
      await supabase.from("searches").update({ status: "running" }).eq("id", search_id);

      const mockLeads = Array.from({ length: Math.min(search.max_results, 10) }, (_, i) => ({
        search_id,
        user_id: user.id,
        business_name: `${search.keyword} ${i + 1} - ${search.city}`,
        address: `Calle Principal ${i + 1}, ${search.city}, ${search.country}`,
        phone: `+34 9${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 10000000).toString().padStart(7, "0")}`,
        website: `https://www.example${i + 1}.com`,
        email: null,
        category: search.keyword,
        rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
        reviews_count: Math.floor(Math.random() * 500),
      }));

      await supabase.from("leads").insert(mockLeads);
      await supabase.from("searches").update({ status: "completed", total_results: mockLeads.length }).eq("id", search_id);
      await supabase.from("profiles").update({ leads_used: (profile?.leads_used ?? 0) + mockLeads.length }).eq("id", user.id);

      return new Response(JSON.stringify({ success: true, mode: "demo", leads: mockLeads.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apify integration
    await supabase.from("searches").update({ status: "running" }).eq("id", search_id);

    const searchQuery = `${search.keyword} in ${search.city}, ${search.country}`;
    const apifyInput = {
      searchStringsArray: [searchQuery],
      maxCrawledPlacesPerSearch: search.max_results,
      language: "es",
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
    };

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&waitForFinish=300`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apifyInput),
      }
    );

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      throw new Error(`Apify error [${apifyRes.status}]: ${errText}`);
    }

    const apifyData = await apifyRes.json();
    const runId = apifyData.data?.id;

    if (runId) {
      await supabase.from("searches").update({ apify_run_id: runId }).eq("id", search_id);
    }

    // Fetch results from Apify dataset
    const datasetId = apifyData.data?.defaultDatasetId;
    if (datasetId) {
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json`
      );
      const items: Record<string, unknown>[] = await dataRes.json();

      if (Array.isArray(items) && items.length > 0) {
        const leads = items.map((item) => ({
          search_id,
          user_id: user.id,
          business_name: (item.title as string) ?? null,
          address: (item.address as string) ?? null,
          phone: (item.phone as string) ?? null,
          website: (item.website as string) ?? null,
          email: (item.email as string) ?? null,
          category: Array.isArray(item.categories) ? (item.categories as string[])[0] : null,
          rating: typeof item.totalScore === "number" ? item.totalScore : null,
          reviews_count: typeof item.reviewsCount === "number" ? item.reviewsCount : null,
          latitude: typeof item.location?.lat === "number" ? item.location.lat : null,
          longitude: typeof item.location?.lng === "number" ? item.location.lng : null,
        }));

        await supabase.from("leads").insert(leads);
        await supabase.from("searches").update({ status: "completed", total_results: leads.length }).eq("id", search_id);
        await supabase.from("profiles").update({ leads_used: (profile?.leads_used ?? 0) + leads.length }).eq("id", user.id);

        // Email enrichment for Growth/Pro plans
        if (profile?.plan === "growth" || profile?.plan === "pro") {
          const leadsWithWebsite = leads.filter((l) => l.website && !l.email);
          for (const lead of leadsWithWebsite.slice(0, 20)) {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 5000);
              const pageRes = await fetch(lead.website!, { signal: controller.signal });
              clearTimeout(timeout);
              const html = await pageRes.text();
              const emailMatch = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
              if (emailMatch) {
                await supabase.from("leads").update({ email: emailMatch[0] }).eq("search_id", search_id).eq("website", lead.website);
              }
            } catch {
              // Timeout or fetch error, skip
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("run-apify-search error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
