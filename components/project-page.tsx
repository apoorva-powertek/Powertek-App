"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { PortalUser } from "@/lib/portal-types";
import { createBrowserSupabase } from "@/lib/supabase";
import { ProjectViewer } from "@/components/project-viewer";
import { projectSignInHref } from "@/lib/workspace-navigation";

export function ProjectPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const supabase = createBrowserSupabase(); let active = true; let generation = 0; let authId: string | null = null;
    async function resolve(next: Session | null) {
      if (!active) return;
      const current = ++generation;
      setSession(next);
      // Opening a report tab can repeat SIGNED_IN for the same account. Keep
      // the current viewer mounted so its selected pole and view are retained.
      if (authId !== (next?.user.id ?? null)) setUser(null);
      authId = next?.user.id ?? null;
      try {
        if (!next) { setUser(null); return; }
        const { data, error } = await supabase.rpc("link_current_portal_user");
        const profile = Array.isArray(data) ? data[0] : data;
        if (!active || current !== generation) return;
        setUser(!error && profile ? { id: profile.id, authUserId: next.user.id, email: profile.email, displayName: profile.display_name, role: profile.role, status: profile.status } : null);
      } catch { if (active && current === generation) setUser(null); }
      finally { if (active && current === generation) setReady(true); }
    }
    void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => { if (event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED") window.setTimeout(() => { if (active) void resolve(next); }, 0); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  async function signOut() { await createBrowserSupabase().auth.signOut(); router.replace("/portal"); }
  if (!ready) return <main className="viewer-loading"><p>Checking your project access…</p></main>;
  if (!session || !user) return <main className="access-shell"><section className="access-card"><p className="eyebrow">SIGN IN REQUIRED</p><h1>Open the secure portal first</h1><p>Your project access is checked against your Powertek account.</p><a className="secondary-cta" href={projectSignInHref(projectId)}>Go to sign in</a></section></main>;
  return <ProjectViewer projectId={projectId} user={user} signOutPath="/portal" onSignOut={() => void signOut()} />;
}

