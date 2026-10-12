"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { PasswordUpdate } from "@/components/portal-login";
import { ThemeControl } from "@/components/theme-control";

export default function InvitePage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabase();
    const params = new URLSearchParams(window.location.hash.slice(1));
    async function accept() {
      if (params.get("error_description")) throw new Error(params.get("error_description") || "Your invitation has expired");
      const code = new URL(window.location.href).searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        window.history.replaceState({}, "", "/invite");
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) throw new Error("This invitation is missing or expired. Ask your administrator for a new invitation.");
      const { data: profile, error: linkError } = await supabase.rpc("link_current_portal_user");
      if (linkError || !(Array.isArray(profile) ? profile[0] : profile)) throw new Error("Your invitation no longer has active portal access. Contact your administrator.");
      if (active) setReady(true);
    }
    void accept().catch((err) => { if (active) setError(err instanceof Error ? err.message : "Could not accept your invitation"); });
    return () => { active = false; };
  }, []);
  if (ready) return <PasswordUpdate invitation />;
  return <main className="access-shell"><ThemeControl /><section className="access-card"><img className="access-logo" src="/powertek-logo.svg" alt="Powertek Utility Services" /><p className="eyebrow">PRIVATE WORKSPACE</p><h1>{error ? "Let’s get you a fresh invitation" : "Verifying your invitation…"}</h1>{error && <><p role="alert">{error}</p><a className="primary-cta" href="/portal">Back to sign in</a></>}</section></main>;
}
