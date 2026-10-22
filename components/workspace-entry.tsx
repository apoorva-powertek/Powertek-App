"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PortalUser } from "@/lib/portal-types";
import { createBrowserSupabase } from "@/lib/supabase";
import { PasswordUpdate, PortalLogin } from "@/components/portal-login";
import { PortalApp } from "@/components/portal-app";
import { ThemeControl } from "@/components/theme-control";
import { recoveryDestination } from "@/lib/password-recovery";

export function WorkspaceEntry({ admin = false }: { admin?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [pending, setPending] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const destination = recoveryDestination(window.location.href);
    if (destination) { window.location.replace(destination); return; }
    // Supabase consumes the fragment during getSession; preserve its purpose.
    const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const supabase = createBrowserSupabase(); let alive = true; let generation = 0;
    async function resolve(next: Session | null) {
      const current = ++generation;
      if (!alive) return;
      setSession(next); setUser(null); setError("");
      if (recoveryLink && next) { setRecovering(true); setPending(false); return; }
      if (!next) { setPending(false); return; }
      setPending(true);
      try {
        const { data, error: linkError } = await supabase.rpc("link_current_portal_user");
        if (!alive || current !== generation) return;
        const profile = Array.isArray(data) ? data[0] : data;
        if (linkError || !profile) throw new Error("Your account has no active Powertek invitation. Contact your administrator.");
        if (!admin && profile.role === "admin") { window.location.replace("/admin"); return; }
        setUser({ id: profile.id, authUserId: next.user.id, email: profile.email, displayName: profile.display_name, role: profile.role, status: profile.status });
      } catch (err) { if (alive && current === generation) setError(err instanceof Error ? err.message : "Could not verify access"); }
      finally { if (alive && current === generation) setPending(false); }
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => { if (sessionError && alive) { setError("Could not load your session. Please sign in again."); setPending(false); } else void resolve(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      if (event === "PASSWORD_RECOVERY") { setRecovering(true); setSession(next); setPending(false); return; }
      // Do not await another Supabase operation inside its auth event lock.
      window.setTimeout(() => { if (alive) void resolve(next); }, 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [admin]);
  async function signOut() { await createBrowserSupabase().auth.signOut(); setSession(null); setUser(null); }
  if (recovering) return <PasswordUpdate />;
  if (pending) return <main className="workspace-loading"><img src="/powertek-logo.svg" alt="Powertek Utility Services" /><span className="loading-ring" /><p>Preparing your secure workspace…</p></main>;
  if (!session) return <PortalLogin admin={admin} />;
  if (error || !user || (admin && user.role !== "admin")) return <main className="access-shell"><ThemeControl /><section className="access-card"><p className="eyebrow">{admin && user ? "ADMINISTRATOR ACCESS REQUIRED" : "ACCESS PENDING"}</p><h1>{admin && user ? "Your client workspace is ready" : "You’re signed in"}</h1><p>{admin && user ? "This account does not have administrator access. Open your assigned workspace instead." : error}</p>{admin && user && <a className="primary-cta" href="/portal">Open workspace</a>}<button className="secondary-cta" onClick={() => void signOut()}>Sign out</button></section></main>;
  return <PortalApp initialUser={user} signOutPath={admin ? "/admin" : "/portal"} onSignOut={() => void signOut()} />;
}
