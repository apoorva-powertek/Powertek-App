"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { PortalUser } from "@/lib/portal-types";
import { createBrowserSupabase } from "@/lib/supabase";
import { PortalLogin } from "@/components/portal-login";
import { PortalApp } from "@/components/portal-app";

export default function PortalPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let alive = true;
    async function resolve(next: Session | null) {
      if (!alive) return;
      setSession(next); setUser(null); setError(""); setPending(Boolean(next));
      if (!next) { setPending(false); return; }
      const { data, error: linkError } = await supabase.rpc("link_current_portal_user");
      if (!alive) return;
      const profile = Array.isArray(data) ? data[0] : data;
      if (linkError || !profile) { setError("This confirmed email does not have an active Powertek portal invitation. Contact your administrator to request access."); setPending(false); return; }
      setUser({ id: profile.id, authUserId: next.user.id, email: profile.email, displayName: profile.display_name, role: profile.role, status: profile.status });
      setPending(false);
    }
    void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { void resolve(next); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signOut() { await createBrowserSupabase().auth.signOut(); setSession(null); setUser(null); }
  if (!session) return <PortalLogin />;
  if (pending) return <main className="viewer-loading"><p>Verifying your Powertek portal access…</p></main>;
  if (error || !user) return <main className="access-shell"><section className="access-card"><p className="eyebrow">ACCESS PENDING</p><h1>Your account is signed in</h1><p>{error || "Portal access has not been assigned."}</p><button className="secondary-cta" onClick={() => void signOut()}>Sign out</button></section></main>;
  return <PortalApp initialUser={user} signOutPath="/" onSignOut={() => void signOut()} />;
}

