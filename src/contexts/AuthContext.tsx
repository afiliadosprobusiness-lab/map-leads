import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Profile } from "@/types/app";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const snapshot = await getDoc(doc(db, "profiles", userId));
      if (!snapshot.exists()) {
        setProfile(null);
        return;
      }

      const data = snapshot.data() as Partial<Profile>;
      setProfile({
        id: snapshot.id,
        email: data.email ?? "",
        full_name: data.full_name ?? null,
        plan: (data.plan as Profile["plan"]) ?? "starter",
        leads_used: data.leads_used ?? 0,
        leads_limit: data.leads_limit ?? 2000,
        stripe_customer_id: data.stripe_customer_id ?? null,
        is_suspended: data.is_suspended ?? false,
        suspended_at: data.suspended_at ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      try {
        setUser(nextUser);
        if (nextUser) {
          await fetchProfile(nextUser.uid);
        } else {
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
