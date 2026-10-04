import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "seller";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  self_registered: boolean;
}

export interface License {
  status: "pending" | "active" | "canceled";
  expiresAt: string | null;
}

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  license: License | null;
  licenseBlocked: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isLicenseBlocked(profile: Profile | null, license: License | null): boolean {
  if (!profile?.self_registered) return false;
  if (!license || license.status !== "active") return true;
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [license, setLicense] = useState<License | null>(null);

  async function loadContext(current: Session | null) {
    if (!current) {
      setProfile(null);
      setRole(null);
      setLicense(null);
      return;
    }
    await supabase.rpc("ensure_profile", {
      _name: (current.user.user_metadata?.["name"] as string | undefined) ?? "",
    });
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, email, phone, active, self_registered")
        .eq("id", current.user.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", current.user.id),
    ]);
    setProfile((p as Profile) ?? null);
    const list = (roles ?? []).map((r) => r.role as Role);
    setRole(list.includes("admin") ? "admin" : (list[0] ?? "seller"));

    if (p?.self_registered) {
      const { data: lic } = await supabase
        .from("licenses")
        .select("status, expires_at")
        .eq("seller_id", current.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLicense(lic ? { status: lic.status as License["status"], expiresAt: lic.expires_at } : null);
    } else {
      setLicense(null);
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => {
        void loadContext(next);
      }, 0);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadContext(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin: role === "admin",
      license,
      licenseBlocked: isLicenseBlocked(profile, license),
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        await loadContext(data.session);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setRole(null);
        setLicense(null);
      },
    }),
    [loading, session, profile, role, license],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
