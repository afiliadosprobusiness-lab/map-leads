import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Plus, Search, Download, LogOut, LayoutDashboard,
  Clock, CheckCircle2, Loader2, XCircle, ChevronRight, Users, Zap, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type SearchStatus = "queued" | "running" | "completed" | "failed";

interface SearchRecord {
  id: string;
  keyword: string;
  city: string;
  country: string;
  max_results: number;
  status: SearchStatus;
  total_results: number;
  created_at: string;
}

interface Lead {
  id: string;
  business_name: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  category: string | null;
}

const statusConfig: Record<SearchStatus, { label: string; icon: React.FC<{ className?: string }>; cls: string }> = {
  queued: { label: "En cola", icon: Clock, cls: "status-queued" },
  running: { label: "Ejecutando", icon: Loader2, cls: "status-running" },
  completed: { label: "Completado", icon: CheckCircle2, cls: "status-completed" },
  failed: { label: "Error", icon: XCircle, cls: "status-failed" },
};

const planLabels: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const planColors: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-primary/10 text-primary",
  pro: "bg-purple-500/10 text-purple-400",
};

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchSearches();

    // Realtime subscription for search status updates
    const channel = supabase
      .channel("searches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "searches", filter: `user_id=eq.${user.id}` }, () => {
        fetchSearches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchSearches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSearches(data as SearchRecord[]);
    setLoadingSearches(false);
  };

  const fetchLeads = async (searchId: string) => {
    setLoadingLeads(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("search_id", searchId)
      .limit(500);
    if (data) setLeads(data as Lead[]);
    setLoadingLeads(false);
  };

  const handleSelectSearch = (s: SearchRecord) => {
    setSelectedSearch(s);
    if (s.status === "completed") fetchLeads(s.id);
    else setLeads([]);
  };

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.keyword.trim() || !form.city.trim() || !form.country.trim()) return;

    // Check quota
    const leadsUsed = profile?.leads_used ?? 0;
    const leadsLimit = profile?.leads_limit ?? 2000;
    if (leadsUsed >= leadsLimit) {
      toast({ title: "Cuota agotada", description: "Has alcanzado el límite de leads de tu plan.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: newSearch, error } = await supabase
      .from("searches")
      .insert({
        user_id: user.id,
        keyword: form.keyword.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        max_results: form.max_results,
        status: "queued",
      })
      .select()
      .single();

    if (error || !newSearch) {
      toast({ title: "Error", description: "No se pudo crear la búsqueda.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Call edge function to trigger Apify
    try {
      const { error: fnError } = await supabase.functions.invoke("run-apify-search", {
        body: { search_id: newSearch.id },
      });
      if (fnError) throw fnError;
    } catch {
      // Search is still created, Apify may not be configured yet
      toast({ title: "Búsqueda creada", description: "Conéctate a Apify para activar el scraping automático.", variant: "default" });
    }

    toast({ title: "¡Búsqueda creada!", description: "El scraping ha comenzado.", });
    setForm({ keyword: "", city: "", country: "", max_results: 100 });
    setShowForm(false);
    fetchSearches();
    setSubmitting(false);
  };

  const handleExportCSV = () => {
    if (!leads.length) return;
    const headers = ["Nombre", "Dirección", "Teléfono", "Web", "Email", "Categoría", "Rating"];
    const rows = leads.map((l) => [
      l.business_name ?? "",
      l.address ?? "",
      l.phone ?? "",
      l.website ?? "",
      l.email ?? "",
      l.category ?? "",
      l.rating?.toString() ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapleads-${selectedSearch?.keyword}-${selectedSearch?.city}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const leadsUsed = profile?.leads_used ?? 0;
  const leadsLimit = profile?.leads_limit ?? 2000;
  const quotaPct = Math.min((leadsUsed / leadsLimit) * 100, 100);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col hidden lg:flex">
        {/* Logo */}
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            Dashboard
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent text-sm transition-colors"
            onClick={() => navigate("/#pricing")}
          >
            <Zap className="w-4 h-4" />
            Actualizar plan
          </button>
        </nav>

        {/* Profile + Plan */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          {/* Quota bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Leads usados</span>
              <span>{leadsUsed.toLocaleString()} / {leadsLimit.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          </div>

          {/* Plan badge */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            <Badge className={`text-xs px-2 ${planColors[profile?.plan ?? "starter"]}`}>
              {planLabels[profile?.plan ?? "starter"]}
            </Badge>
          </div>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus búsquedas y leads</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva búsqueda
          </Button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Searches list */}
          <div className="w-80 flex-shrink-0 border-r border-border/50 flex flex-col bg-card/20">
            <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Búsquedas</span>
              <span className="ml-auto text-xs text-muted-foreground">{searches.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingSearches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : searches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Globe className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Aún no tienes búsquedas</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    Crear primera búsqueda
                  </button>
                </div>
              ) : (
                searches.map((s) => {
                  const StatusIcon = statusConfig[s.status]?.icon ?? Clock;
                  const isSelected = selectedSearch?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSearch(s)}
                      className={`w-full text-left px-4 py-3.5 border-b border-border/20 hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-foreground truncate">{s.keyword}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.city}, {s.country}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                      <div className={`flex items-center gap-1.5 mt-2 text-xs ${statusConfig[s.status]?.cls}`}>
                        <StatusIcon className={`w-3 h-3 ${s.status === "running" ? "animate-spin" : ""}`} />
                        {statusConfig[s.status]?.label}
                        {s.status === "completed" && (
                          <span className="ml-auto text-muted-foreground">{s.total_results} leads</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {showForm ? (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-lg">
                  <h2 className="text-lg font-bold font-display text-foreground mb-6">Nueva búsqueda</h2>
                  <form onSubmit={handleCreateSearch} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground">Keyword *</Label>
                      <Input
                        placeholder="ej: restaurantes, dentistas, abogados..."
                        value={form.keyword}
                        onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                        required
                        maxLength={100}
                        className="bg-muted border-border/50 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">Ciudad *</Label>
                        <Input
                          placeholder="ej: Barcelona"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          required
                          maxLength={100}
                          className="bg-muted border-border/50 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-foreground">País *</Label>
                        <Input
                          placeholder="ej: España"
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          required
                          maxLength={100}
                          className="bg-muted border-border/50 focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-foreground">Máximo resultados</Label>
                      <Input
                        type="number"
                        min={10}
                        max={Math.min(500, leadsLimit - leadsUsed)}
                        value={form.max_results}
                        onChange={(e) => setForm({ ...form, max_results: parseInt(e.target.value) || 100 })}
                        className="bg-muted border-border/50 focus:border-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Cuota disponible: {(leadsLimit - leadsUsed).toLocaleString()} leads
                      </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold flex-1"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {submitting ? "Iniciando..." : "Iniciar búsqueda"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : selectedSearch ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search detail header */}
                <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-foreground font-display">{selectedSearch.keyword}</h2>
                    <p className="text-sm text-muted-foreground">{selectedSearch.city}, {selectedSearch.country} · máx {selectedSearch.max_results}</p>
                  </div>
                  {selectedSearch.status === "completed" && leads.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportCSV}
                      className="border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Exportar CSV ({leads.length})
                    </Button>
                  )}
                </div>

                {/* Leads table */}
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
                            <StatusIcon className={`w-12 h-12 mb-4 ${statusConfig[selectedSearch.status]?.cls} ${selectedSearch.status === "running" ? "animate-spin" : ""}`} />
                            <p className="text-base font-medium text-foreground mb-2">{statusConfig[selectedSearch.status]?.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSearch.status === "queued" && "La búsqueda está en cola, comenzará pronto."}
                              {selectedSearch.status === "running" && "El scraping está en progreso, espera unos minutos."}
                              {selectedSearch.status === "failed" && "La búsqueda falló. Intenta de nuevo."}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                      <p className="text-base font-medium text-foreground mb-2">Sin resultados</p>
                      <p className="text-sm text-muted-foreground">No se encontraron negocios para esta búsqueda.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/30">
                        <tr>
                          {["Negocio", "Categoría", "Teléfono", "Web", "Email", "Rating"].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{lead.business_name ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.category ?? "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.phone ?? "—"}</td>
                            <td className="px-4 py-3">
                              {lead.website ? (
                                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[120px]">
                                  {lead.website.replace(/^https?:\/\//, "")}
                                </a>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{lead.email ?? "—"}</td>
                            <td className="px-4 py-3">
                            {lead.rating ? (
                                <span className="text-warning">★ {lead.rating}</span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow">
                  <MapPin className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                  Bienvenido a MapLeads
                </h2>
                <p className="text-muted-foreground max-w-sm mb-8">
                  Crea tu primera búsqueda para extraer leads de Google Maps de cualquier ciudad del mundo.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera búsqueda
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
