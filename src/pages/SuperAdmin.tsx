import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCcw, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { invokeSuperadminUsers } from "@/lib/firebaseApi";
import { PlanType } from "@/types/app";

type ActionType = "set_plan" | "suspend_user" | "restore_user" | "delete_user";

interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  plan: PlanType;
  leads_used: number;
  leads_limit: number;
  is_suspended: boolean;
  suspended_at: string | null;
  created_at: string;
}

function mapSuperadminError(error: unknown, fallbackMessage: string, serviceUnavailableMessage: string): string {
  if (!(error instanceof Error)) return fallbackMessage;

  const message = error.message.toLowerCase();
  const likelyServiceIssue =
    message.includes("cors") ||
    message.includes("404") ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("internal");

  if (likelyServiceIssue) {
    return serviceUnavailableMessage;
  }

  return error.message;
}

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [planDraft, setPlanDraft] = useState<Record<string, PlanType>>({});

  const isAuthorized = useMemo(() => isSuperAdminEmail(user?.email), [user?.email]);

  const fetchUsers = useCallback(
    async (query?: string) => {
      setLoadingUsers(true);

      try {
        const data = (await invokeSuperadminUsers({
          action: "list_users",
          query: query?.trim() || undefined,
          limit: 500,
        })) as { users?: ManagedUser[] };

        const rows = (data.users ?? []).map((row) => ({
          ...row,
          plan: row.plan ?? "starter",
          leads_used: row.leads_used ?? 0,
          leads_limit: row.leads_limit ?? 2000,
          is_suspended: row.is_suspended ?? false,
        }));

        const nextPlanDraft: Record<string, PlanType> = {};
        for (const row of rows) {
          nextPlanDraft[row.id] = row.plan;
        }

        setUsers(rows);
        setPlanDraft(nextPlanDraft);
      } catch (error) {
        const message = mapSuperadminError(error, t("admin.actionError"), t("admin.serviceUnavailable"));
        toast({ title: t("admin.actionError"), description: message, variant: "destructive" });
        setUsers([]);
      }

      setLoadingUsers(false);
    },
    [t, toast],
  );

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isAuthorized) {
      toast({ title: t("admin.actionError"), description: t("admin.unauthorized"), variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    fetchUsers();
  }, [user, loading, isAuthorized, navigate, fetchUsers, t, toast]);

  const runAction = async (action: ActionType, managedUser: ManagedUser) => {
    if (action === "delete_user") {
      const confirmed = window.confirm(t("admin.confirmDelete"));
      if (!confirmed) return;
    }

    const key = `${action}:${managedUser.id}`;
    setBusyAction(key);

    try {
      await invokeSuperadminUsers({
        action,
        user_id: managedUser.id,
        plan: action === "set_plan" ? planDraft[managedUser.id] ?? managedUser.plan : undefined,
      });

      toast({ title: t("admin.actionSuccess") });
      await fetchUsers(search);
    } catch (error) {
      const message = mapSuperadminError(error, t("admin.actionError"), t("admin.serviceUnavailable"));
      toast({ title: t("admin.actionError"), description: message, variant: "destructive" });
    }

    setBusyAction("");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-4 sm:px-6 py-4 bg-card/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-primary" />
              {t("admin.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("admin.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            className="sm:max-w-sm"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchUsers(search)}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t("admin.refresh")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/20">
          <div className="grid grid-cols-[minmax(240px,2fr)_130px_130px_120px_320px] gap-3 px-4 py-3 border-b border-border/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground overflow-x-auto min-w-[950px]">
            <span>{t("admin.colUser")}</span>
            <span>{t("admin.colPlan")}</span>
            <span>{t("admin.colUsage")}</span>
            <span>{t("admin.colStatus")}</span>
            <span>{t("admin.colActions")}</span>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t("admin.noUsers")}</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[950px] divide-y divide-border/40">
                {users.map((managedUser) => {
                  const suspendAction: ActionType = managedUser.is_suspended ? "restore_user" : "suspend_user";
                  const suspendLabel = managedUser.is_suspended ? t("admin.restore") : t("admin.suspend");

                  return (
                    <div key={managedUser.id} className="grid grid-cols-[minmax(240px,2fr)_130px_130px_120px_320px] gap-3 px-4 py-3 items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{managedUser.full_name || managedUser.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{managedUser.email}</p>
                      </div>

                      <div>
                        <select
                          value={planDraft[managedUser.id] ?? managedUser.plan}
                          onChange={(event) =>
                            setPlanDraft((prev) => ({ ...prev, [managedUser.id]: event.target.value as PlanType }))
                          }
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`${t("admin.colPlan")} ${managedUser.email}`}
                        >
                          <option value="starter">Starter</option>
                          <option value="growth">Growth</option>
                          <option value="pro">Pro</option>
                        </select>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {managedUser.leads_used.toLocaleString()} / {managedUser.leads_limit.toLocaleString()}
                      </p>

                      <Badge className={managedUser.is_suspended ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"}>
                        {managedUser.is_suspended ? t("admin.suspended") : t("admin.active")}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyAction.length > 0}
                          onClick={() => runAction("set_plan", managedUser)}
                        >
                          {busyAction === `set_plan:${managedUser.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          {t("admin.savePlan")}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyAction.length > 0 || isSuperAdminEmail(managedUser.email)}
                          onClick={() => runAction(suspendAction, managedUser)}
                        >
                          {busyAction === `${suspendAction}:${managedUser.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                          {suspendLabel}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyAction.length > 0 || isSuperAdminEmail(managedUser.email)}
                          onClick={() => runAction("delete_user", managedUser)}
                        >
                          {busyAction === `delete_user:${managedUser.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                          {t("admin.delete")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
