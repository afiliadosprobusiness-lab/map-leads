import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      toast({ title: t("auth.loginError"), description: message, variant: "destructive" });
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    setLoading(true);

    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      await updateAuthProfile(credentials.user, { displayName: fullName });
      await sendEmailVerification(credentials.user);

      const now = new Date().toISOString();

      await setDoc(
        doc(db, "profiles", credentials.user.uid),
        {
          id: credentials.user.uid,
          email,
          full_name: fullName,
          plan: "starter",
          leads_used: 0,
          leads_limit: 2000,
          stripe_customer_id: null,
          is_suspended: false,
          suspended_at: null,
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      );

      await setDoc(
        doc(db, "subscriptions", credentials.user.uid),
        {
          user_id: credentials.user.uid,
          plan: "starter",
          status: "active",
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      );

      toast({ title: t("auth.registerSuccess"), description: t("auth.registerSuccessDesc") });
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register";
      toast({ title: t("auth.registerError"), description: message, variant: "destructive" });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 grid-glow opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: "hsl(var(--brand-blue) / 0.08)" }} />

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitch />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.back")}
        </button>

        <div className="gradient-card glow-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow-sm">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">
              Map<span className="text-brand">Leads</span>
            </span>
          </div>

          <div className="flex rounded-xl bg-muted p-1 mb-8">
            {(["login", "register"] as const).map((tabItem) => (
              <button
                key={tabItem}
                type="button"
                onClick={() => setTab(tabItem)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  tab === tabItem ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabItem === "login" ? t("auth.login") : t("auth.register")}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-foreground">
                  {t("auth.email")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-foreground">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-muted border-border/50 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold"
                disabled={loading}
              >
                {loading ? t("auth.loginLoading") : t("auth.loginBtn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-foreground">
                  {t("auth.name")}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("auth.namePlaceholder")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-muted border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-reg" className="text-sm text-foreground">
                  {t("auth.email")}
                </Label>
                <Input
                  id="email-reg"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border/50 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-reg" className="text-sm text-foreground">
                  {t("auth.password")}
                </Label>
                <div className="relative">
                  <Input
                    id="password-reg"
                    type={showPw ? "text" : "password"}
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-muted border-border/50 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 gradient-primary text-primary-foreground border-0 shadow-glow-sm hover:opacity-90 font-semibold"
                disabled={loading}
              >
                {loading ? t("auth.registerLoading") : t("auth.registerBtn")}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {t("auth.terms1")} <a href="/terms" className="text-primary hover:underline">{t("auth.termsLink")}</a> {t("auth.terms2")} <a href="/privacy" className="text-primary hover:underline">{t("auth.privacyLink")}</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
