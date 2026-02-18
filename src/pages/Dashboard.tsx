import { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Search,
  Download,
  LogOut,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronRight,
  Users,
  Zap,
  Globe,
  Shield,
} from "lucide-react";
import {
  addDoc,
  collection,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { invokeRunApifySearch } from "@/lib/firebaseApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LanguageContext";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { Lead, SearchRecord, SearchStatus } from "@/types/app";

const planLabels: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const planColors: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-primary/10 text-primary",
  pro: "bg-cyan-500/10 text-cyan",
};

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function mapSearch(snapshot: QueryDocumentSnapshot<DocumentData>): SearchRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    user_id: data.user_id,
    keyword: data.keyword,
    city: data.city,
    country: data.country,
    max_results: data.max_results ?? 100,
    status: (data.status as SearchStatus) ?? "queued",
    total_results: data.total_results ?? 0,
    error_message: data.error_message ?? null,
    apify_run_id: data.apify_run_id ?? null,
    created_at: toIsoString(data.created_at),
    updated_at: toIsoString(data.updated_at),
  };
}

function mapLead(snapshot: QueryDocumentSnapshot<DocumentData>): Lead {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    search_id: data.search_id,
    user_id: data.user_id,
    business_name: data.business_name ?? null,
    address: data.address ?? null,
    phone: data.phone ?? null,
    website: data.website ?? null,
    email: data.email ?? null,
    rating: typeof data.rating === "number" ? data.rating : null,
    category: data.category ?? null,
    reviews_count: typeof data.reviews_count === "number" ? data.reviews_count : null,
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    created_at: toIsoString(data.created_at),
  };
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLang();

  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<SearchRecord | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingSearches, setLoadingSearches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [form, setForm] = useState({
    keyword: "",
    city: "",
    country: "",
    max_results: 100,
  });

  const statusConfig = useMemo(
    () => ({
      queued: { label: t("dash.statusQueued"), desc: t("dash.statusQueuedDesc"), icon: Clock, cls: "status-queued" },
      running: { label: t("dash.statusRunning"), desc: t("dash.statusRunningDesc"), icon: Loader2, cls: "status-running" },
      completed: { label: t("dash.statusCompleted"), desc: "", icon: CheckCircle2, cls: "status-completed" },
      failed: { label: t("dash.statusFailed"), desc: t("dash.statusFailedDesc"), icon: XCircle, cls: "status-failed" },
    }),
    [t],
  );

  const fetchLeads = useCallback(async (searchId: string) => {
    setLoadingLeads(true);

    const leadsQuery = query(collection(db, "leads"), where("search_id", "==", searchId), limit(500));
    const leadsSnapshot = await getDocs(leadsQuery);
    setLeads(leadsSnapshot.docs.map(mapLead));

    setLoadingLeads(false);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isSuperAdminEmail(user.email)) {
      navigate("/superadmin", { replace: true });
      return;
    }

    setLoadingSearches(true);

    const searchesQuery = query(
      collection(db, "searches"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc"),
      limit(50),
    );

    const unsubscribe = onSnapshot(
      searchesQuery,
      (snapshot) => {
        const nextSearches = snapshot.docs.map(mapSearch);
        setSearches(nextSearches);
        setLoadingSearches(false);
      },
      (error) => {
        toast({ title: t("dash.searchError"), description: error.message, variant: "destructive" });
        setLoadingSearches(false);
      },
    );

    return () => unsubscribe();
  }, [user, navigate, t, toast]);

  useEffect(() => {
    if (!profile?.is_suspended) return;

    toast({ title: t("dash.suspendedTitle"), description: t("dash.suspendedDesc"), variant: "destructive" });
    signOut();
    navigate("/auth");
  }, [profile?.is_suspended, navigate, signOut, t, toast]);

  useEffect(() => {
    if (!selectedSearch) return;

    const refreshed = searches.find((item) => item.id === selectedSearch.id);
    if (!refreshed) {
      setSelectedSearch(null);
      setLeads([]);
      return;
    }

    setSelectedSearch(refreshed);
    if (refreshed.status === "completed") {
      fetchLeads(refreshed.id);
    }
  }, [searches, selectedSearch, fetchLeads]);

  const handleSelectSearch = (search: SearchRecord) => {
    setSelectedSearch(search);
    if (search.status === "completed") {
      fetchLeads(search.id);
    } else {
      setLeads([]);
    }
  };

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.keyword.trim() || !form.city.trim() || !form.country.trim()) return;

    const leadsUsed = profile?.leads_used ?? 0;
    const leadsLimit = profile?.leads_limit ?? 2000;

    if (leadsUsed >= leadsLimit) {
      toast({ title: t("dash.quotaError"), description: t("dash.quotaErrorDesc"), variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const newSearchRef = await addDoc(collection(db, "searches"), {
        user_id: user.uid,
        keyword: form.keyword.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        max_results: form.max_results,
        status: "queued",
        total_results: 0,
        error_message: null,
        apify_run_id: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      try {
        await invokeRunApifySearch(newSearchRef.id);
      } catch (error) {
        const description = error instanceof Error ? error.message : t("dash.apifyNotConfigured");
        toast({ title: t("dash.searchCreated"), description });
      }

      toast({ title: t("dash.searchCreated"), description: t("dash.searchCreatedDesc") });
      setForm({ keyword: "", city: "", country: "", max_results: 100 });
      setShowForm(false);
    } catch {
      toast({ title: t("dash.searchError"), description: t("dash.searchErrorDesc"), variant: "destructive" });
    }

    setSubmitting(false);
  };

  const handleExportCsv = () => {
    if (!leads.length || !selectedSearch) return;

    const headers = [
      t("dash.colName"),
      t("dash.colAddress"),
      t("dash.colPhone"),
      t("dash.colWebsite"),
      t("dash.colEmail"),
      t("dash.colCategory"),
      t("dash.colRating"),
    ];

    const rows = leads.map((lead) => [
      lead.business_name ?? "",
      lead.address ?? "",
      lead.phone ?? "",
      lead.website ?? "",
      lead.email ?? "",
      lead.category ?? "",
      lead.rating?.toString() ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mapleads-${selectedSearch.keyword}-${selectedSearch.city}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const leadsUsed = profile?.leads_used ?? 0;
  const leadsLimit = profile?.leads_limit ?? 2000;
  const quotaPct = Math.min((leadsUsed / Math.max(leadsLimit, 1)) * 100, 100);
  const canAccessSuperAdmin = isSuperAdminEmail(user?.email);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="hidden lg:flex w-72 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-display text-foreground">
              Map<span className="text-brand">Leads</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            {t("dash.title")}
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent text-sm transition-colors"
            onClick={() => navigate("/#pricing")}
          >
            <Zap className="w-4 h-4" />
            {t("dash.upgradeBtn")}
          </button>

          {canAccessSuperAdmin ? (
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent text-sm transition-colors"
              onClick={() => navigate("/superadmin")}
            >
              <Shield className="w-4 h-4" />
              {t("dash.superAdmin")}
            </button>
          ) : null}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <LanguageSwitch className="w-fit" />
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{t("dash.leadsUsed")}</span>
              <span>
                {leadsUsed.toLocaleString()} / {leadsLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full gradient-primary transition-all" style={{ width: `${quotaPct}%` }} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            <Badge className={`text-xs px-2 ${planColors[profile?.plan ?? "starter"]}`}>
              {planLabels[profile?.plan ?? "starter"]}
            </Badge>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("dash.signOut")}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-border/50 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-card/50 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">{t("dash.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dash.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <LanguageSwitch className="lg:hidden" />
            <Button variant="outline" onClick={signOut} className="lg:hidden">
              <LogOut className="w-4 h-4 mr-2" />
              {t("dash.signOut")}
            </Button>
            {canAccessSuperAdmin ? (
              <Button variant="outline" onClick={() => navigate("/superadmin")} className="lg:hidden flex-1 sm:flex-none">
                <Shield className="w-4 h-4 mr-2" />
                {t("dash.superAdmin")}
              </Button>
            ) : null}
            <Button
              onClick={() => setShowForm(true)}
              className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("dash.newSearch")}
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 min-w-0">
          <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4 h-full min-w-0">
            <section className="border border-border/50 rounded-2xl bg-card/20 min-h-[280px] xl:min-h-0 flex flex-col min-w-0">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t("dash.searches")}</span>
                <span className="ml-auto text-xs text-muted-foreground">{searches.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingSearches ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : searches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                    <Globe className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">{t("dash.emptyTitle")}</p>
                    <button type="button" onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary hover:underline">
                      {t("dash.emptyCreate")}
                    </button>
                  </div>
                ) : (
                  searches.map((search) => {
                    const isSelected = selectedSearch?.id === search.id;
                    const StatusIcon = statusConfig[search.status]?.icon ?? Clock;
                    return (
                      <button
                        key={search.id}
                        type="button"
                        onClick={() => handleSelectSearch(search)}
                        className={`w-full text-left px-4 py-3.5 border-b border-border/20 hover:bg-muted/30 transition-colors ${
                          isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground truncate">{search.keyword}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {search.city}, {search.country}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <div className={`flex items-center gap-1.5 mt-2 text-xs ${statusConfig[search.status]?.cls}`}>
                          <StatusIcon className={`w-3 h-3 ${search.status === "running" ? "animate-spin" : ""}`} />
                          {statusConfig[search.status]?.label}
                          {search.status === "completed" ? (
                            <span className="ml-auto text-muted-foreground">{search.total_results} leads</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="border border-border/50 rounded-2xl bg-card/20 min-h-[420px] overflow-hidden min-w-0">
              {showForm ? (
                <div className="p-5 sm:p-6 overflow-y-auto h-full">
                  <div className="max-w-lg">
                    <h2 className="text-lg font-bold font-display text-foreground mb-6">{t("dash.newSearchTitle")}</h2>
                    <form onSubmit={handleCreateSearch} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="keyword" className="text-sm text-foreground">
                          {t("dash.keyword")} *
                        </Label>
                        <Input
                          id="keyword"
                          placeholder={t("dash.keywordPlaceholder")}
                          value={form.keyword}
                          onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                          required
                          maxLength={100}
                          className="bg-muted border-border/50 focus:border-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-sm text-foreground">
                            {t("dash.city")} *
                          </Label>
                          <Input
                            id="city"
                            placeholder={t("dash.cityPlaceholder")}
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            required
                            maxLength={100}
                            className="bg-muted border-border/50 focus:border-primary"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="country" className="text-sm text-foreground">
                            {t("dash.country")} *
                          </Label>
                          <Input
                            id="country"
                            placeholder={t("dash.countryPlaceholder")}
                            value={form.country}
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                            required
                            maxLength={100}
                            className="bg-muted border-border/50 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-results" className="text-sm text-foreground">
                          {t("dash.maxResults")}
                        </Label>
                        <Input
                          id="max-results"
                          type="number"
                          min={10}
                          max={Math.max(10, Math.min(500, leadsLimit - leadsUsed))}
                          value={form.max_results}
                          onChange={(e) => setForm({ ...form, max_results: parseInt(e.target.value, 10) || 100 })}
                          className="bg-muted border-border/50 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t("dash.quotaAvailable")}: {(leadsLimit - leadsUsed).toLocaleString()} leads
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold flex-1"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {submitting ? t("dash.starting") : t("dash.startSearch")}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                          {t("dash.cancel")}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : selectedSearch ? (
                <div className="flex h-full flex-col min-w-0">
                  <div className="px-5 sm:px-6 py-4 border-b border-border/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-foreground font-display truncate">{selectedSearch.keyword}</h2>
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedSearch.city}, {selectedSearch.country} · {t("dash.detailsMeta")} {selectedSearch.max_results}
                      </p>
                    </div>

                    {selectedSearch.status === "completed" && leads.length > 0 ? (
                      <Button size="sm" variant="outline" onClick={handleExportCsv} className="border-primary/30 text-primary hover:bg-primary/5">
                        <Download className="w-3.5 h-3.5 mr-2" />
                        {t("dash.exportCsv")} ({leads.length})
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-auto">
                    {loadingLeads ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : selectedSearch.status !== "completed" ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        {(() => {
                          const StatusIcon = statusConfig[selectedSearch.status]?.icon ?? Clock;
                          return (
                            <>
                              <StatusIcon
                                className={`w-12 h-12 mb-4 ${statusConfig[selectedSearch.status]?.cls} ${selectedSearch.status === "running" ? "animate-spin" : ""}`}
                              />
                              <p className="text-base font-medium text-foreground mb-2">{statusConfig[selectedSearch.status]?.label}</p>
                              <p className="text-sm text-muted-foreground">{statusConfig[selectedSearch.status]?.desc}</p>
                            </>
                          );
                        })()}
                      </div>
                    ) : leads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                        <p className="text-base font-medium text-foreground mb-2">{t("dash.noResults")}</p>
                        <p className="text-sm text-muted-foreground">{t("dash.noResultsDesc")}</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                          <thead className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/30">
                            <tr>
                              {[t("dash.colName"), t("dash.colCategory"), t("dash.colPhone"), t("dash.colWebsite"), t("dash.colEmail"), t("dash.colRating")].map((header) => (
                                <th key={header} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {leads.map((lead) => (
                              <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground max-w-[220px] truncate">{lead.business_name ?? "-"}</td>
                                <td className="px-4 py-3 text-muted-foreground">{lead.category ?? "-"}</td>
                                <td className="px-4 py-3 text-muted-foreground">{lead.phone ?? "-"}</td>
                                <td className="px-4 py-3 max-w-[180px]">
                                  {lead.website ? (
                                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                                      {lead.website.replace(/^https?:\/\//, "")}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{lead.email ?? "-"}</td>
                                <td className="px-4 py-3">{lead.rating ? <span className="text-warning">★ {lead.rating}</span> : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow">
                    <MapPin className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold font-display text-foreground mb-2">{t("dash.welcomeTitle")}</h2>
                  <p className="text-muted-foreground max-w-sm mb-8">{t("dash.welcomeDesc")}</p>
                  <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("dash.createFirst")}
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
