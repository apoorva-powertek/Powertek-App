"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { PortalUser } from "@/lib/portal-types";
import { createBrowserSupabase } from "@/lib/supabase";
import { ProjectViewer } from "@/components/project-viewer";

export function ProjectPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const supabase = createBrowserSupabase(); let active = true;
    async function resolve(next: Session | null) {
      if (!active) return;
      setSession(next); setUser(null);
      if (next) {
        const { data } = await supabase.rpc("link_current_portal_user");
        const profile = Array.isArray(data) ? data[0] : data;
        if (active && profile) setUser({ id: profile.id, authUserId: next.user.id, email: profile.email, displayName: profile.display_name, role: profile.role, status: profile.status });
      }
      if (active) setReady(true);
    }
    void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { void resolve(next); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  async function signOut() { await createBrowserSupabase().auth.signOut(); router.replace("/portal"); }
  if (!ready) return <main className="viewer-loading"><p>Checking your project access…</p></main>;
  if (!session || !user) return <main className="access-shell"><section className="access-card"><p className="eyebrow">SIGN IN REQUIRED</p><h1>Open the secure portal first</h1><p>Your project access is checked against your Powertek account.</p><a className="secondary-cta" href="/portal">Go to sign in</a></section></main>;
  return <ProjectViewer projectId={projectId} user={user} signOutPath="/portal" onSignOut={() => void signOut()} />;
}

