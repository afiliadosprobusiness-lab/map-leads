import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Eye, EyeOff, ArrowLeft } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile as updateAuthProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { getPostAuthRoute } from "@/lib/superadmin";

const STARTER_LEADS_LIMIT = 2000;

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
    if (user) {
      navigate(getPostAuthRoute(user.email), { replace: true });
    }
  }, [user, navigate]);

  const ensureUserDocuments = async (firebaseUser: User, overrides?: { email?: string; fullName?: string }) => {
    const now = new Date().toISOString();
    const normalizedEmail = overrides?.email ?? firebaseUser.email ?? "";
    const normalizedName = overrides?.fullName ?? firebaseUser.displayName ?? null;
    const profileRef = doc(db, "profiles", firebaseUser.uid);
    const profileSnapshot = await getDoc(profileRef);

    if (!profileSnapshot.exists()) {
      await setDoc(
        profileRef,
        {
          id: firebaseUser.uid,
          email: normalizedEmail,
          full_name: normalizedName,
          plan: "starter",
          leads_used: 0,
          leads_limit: STARTER_LEADS_LIMIT,
          stripe_customer_id: null,
          is_suspended: false,
          suspended_at: null,
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      );
    } else {
      const currentProfile = profileSnapshot.data();
      const profilePatch: Record<string, unknown> = { updated_at: now };

      if (!currentProfile.email && normalizedEmail) {
        profilePatch.email = normalizedEmail;
      }
      if (!currentProfile.full_name && normalizedName) {
        profilePatch.full_name = normalizedName;
      }

      if (Object.keys(profilePatch).length > 1) {
        await setDoc(profileRef, profilePatch, { merge: true });
      }
    }

    const subscriptionRef = doc(db, "subscriptions", firebaseUser.uid);
    const subscriptionSnapshot = await getDoc(subscriptionRef);

    if (!subscriptionSnapshot.exists()) {
      await setDoc(
        subscriptionRef,
        {
          user_id: firebaseUser.uid,
          plan: "starter",
          status: "active",
          created_at: now,
          updated_at: now,
        },
        { merge: true },
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);

    try {
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      navigate(getPostAuthRoute(credentials.user.email), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      toast({ title: t("auth.loginError"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    setLoading(true);

    try {
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      await updateAuthProfile(credentials.user, { displayName: fullName });
      await sendEmailVerification(credentials.user);
      await ensureUserDocuments(credentials.user, { email, fullName });

      toast({ title: t("auth.registerSuccess"), description: t("auth.registerSuccessDesc") });
      navigate(getPostAuthRoute(credentials.user.email), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register";
      toast({ title: t("auth.registerError"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const credentials = await signInWithPopup(auth, provider);
      await ensureUserDocuments(credentials.user);
      navigate(getPostAuthRoute(credentials.user.email), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to continue with Google";
      toast({ title: t("auth.googleError"), description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

          <div className="space-y-4 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 border-border/60 bg-card hover:bg-muted/70"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-2 h-4 w-4">
                <path fill="#EA4335" d="M12 10.2v3.95h5.49c-.24 1.27-.96 2.35-2.04 3.08l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.49 0-.73-.07-1.44-.2-2.12H12Z" />
                <path fill="#34A853" d="M6.54 14.28 5.8 14.84l-2.62 2.04A9.98 9.98 0 0 0 12 22c2.7 0 4.96-.9 6.61-2.43l-3.3-2.56c-.9.61-2.05.97-3.31.97-2.6 0-4.8-1.76-5.58-4.13Z" />
                <path fill="#4A90E2" d="M3.18 7.12A9.98 9.98 0 0 0 2 12c0 1.75.42 3.4 1.18 4.88 0 .01 3.36-2.61 3.36-2.61A5.98 5.98 0 0 1 6 12c0-.8.19-1.57.54-2.27L3.18 7.12Z" />
                <path fill="#FBBC05" d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.96 2.98 14.7 2 12 2a9.98 9.98 0 0 0-8.82 5.12l3.36 2.61c.78-2.37 2.98-4.13 5.46-4.13Z" />
              </svg>
              {loading ? t("auth.googleLoading") : t("auth.continueWithGoogle")}
            </Button>
            <div className="relative flex items-center">
              <span className="w-full border-t border-border/60" />
              <span className="absolute left-1/2 -translate-x-1/2 bg-card px-2 text-xs text-muted-foreground">{t("auth.orEmail")}</span>
            </div>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
