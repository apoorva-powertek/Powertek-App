"use client";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { completePasswordRecovery } from "@/lib/password-recovery";
import { PasswordUpdate, PortalLogin } from "@/components/portal-login";
import { ThemeControl } from "@/components/theme-control";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const attempt = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let active = true;
    // One exchange even when Strict Mode repeats effect setup.
    attempt.current ??= completePasswordRecovery(createBrowserSupabase);
    void attempt.current.then(() => { if (active) setReady(true); }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : "Could not verify this reset link. Request a new email.");
    });
    return () => { active = false; };
  }, []);
  if (requesting) return <PortalLogin initialMode="reset" />;
  if (ready) return <PasswordUpdate />;
  return <main className="access-shell"><ThemeControl /><section className="access-card"><p className="eyebrow">PASSWORD RESET</p><h1>{error ? "Request a fresh reset link" : "Verifying your reset link…"}</h1>{error && <><p role="alert">{error}</p><button className="primary-cta" onClick={() => setRequesting(true)}>Request a new reset email</button><a className="secondary-cta" href="/admin">Back to sign in</a></>}</section></main>;
}
