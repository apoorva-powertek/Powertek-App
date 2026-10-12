"use client";
import Image from "next/image";

import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { ThemeControl } from "@/components/theme-control";
import { createBrowserSupabase } from "@/lib/supabase";

function Brand() { return <div className="portal-brand"><Image src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority /></div>; }

export function PasswordUpdate({ invitation = false }: { invitation?: boolean }) {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (password !== confirm) { setError("The passwords do not match."); return; } setBusy(true); try { const { error: updateError } = await createBrowserSupabase().auth.updateUser({ password }); if (updateError) throw updateError; window.location.replace("/portal"); } catch (err) { setError(err instanceof Error ? err.message : "Could not update the password"); } finally { setBusy(false); } }
  return <main className="access-shell"><ThemeControl /><Brand /><section className="access-card"><p className="eyebrow">{invitation ? "YOU’RE INVITED" : "PASSWORD RESET"}</p><h1>{invitation ? "Set your workspace password" : "Choose a new password"}</h1><form className="portal-login-form" onSubmit={submit}><label><LockKeyhole size={16} /><input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-label="New password" placeholder="New password" /></label><label><LockKeyhole size={16} /><input type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} aria-label="Confirm password" placeholder="Confirm password" /></label>{error && <p role="alert" aria-live="polite" className="login-feedback error">{error}</p>}<button className="primary-cta" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : invitation ? "Accept invitation" : "Update password"}<ArrowRight size={17} /></button></form></section></main>;
}

export function PortalLogin({ admin = false }: { admin?: boolean }) {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createBrowserSupabase();
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/portal` });
        if (resetError) throw resetError;
        setMessage("If that address has a portal account, a password reset email is on its way.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.reload();
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Could not complete sign in"); }
    finally { setBusy(false); }
  }

  return <main className="login-shell"><div className="login-grid" aria-hidden="true" /><header className="login-header"><Brand /><div className="login-header-actions"><span className="secure-label"><ShieldCheck size={14} /> Invite-only workspace</span><ThemeControl /></div></header><section className="login-hero"><div className="login-copy"><p className="eyebrow">{admin ? "POWERTEK ADMINISTRATION" : "FIELD DATA, ENGINEERED"}</p><h1>{admin ? <>Your operations.<br /><em>One clear view.</em></> : <>Every pole. Every height.<br /><em>One exact view.</em></>}</h1><p className="login-lede">A protected workspace for full-resolution pole imagery, measured attachments, satellite locations, and engineering profiles.</p><form onSubmit={submit} className="portal-login-form"><label><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Work email" placeholder="Work email" /></label>{mode !== "reset" && <label><LockKeyhole size={16} /><input type="password" minLength={8} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Password" placeholder="Password" /></label>}{error && <p role="alert" aria-live="polite" className="login-feedback error">{error}</p>}{message && <p role="status" aria-live="polite" className="login-feedback">{message}</p>}<button className="primary-cta" disabled={busy} aria-busy={busy}>{busy ? "Please wait…" : mode === "reset" ? "Send reset email" : "Sign in to your portal"}<ArrowRight size={17} /></button></form><div className="login-mode-links">{mode === "signin" ? <><button onClick={() => setMode("reset")}>Forgot password?</button></> : <button onClick={() => { setMode("signin"); setError(""); setMessage(""); }}>Back to sign in</button>}</div><p className="login-note"><LockKeyhole size={13} /> Access is by invitation. Use the email from your administrator to set your password.</p></div><div className="login-visual" aria-label="Pole survey portal feature preview"><div className="visual-top"><span>ILLUSTRATIVE PROJECT VIEW</span><span className="status-dot">Protected</span></div><div className="visual-map"><span className="map-road road-a" /><span className="map-road road-b" />{["P-204", "P-205", "P-206", "P-207", "P-208"].map((label, index) => <span key={label} className={`demo-pin pin-${index + 1}`}><i />{label}</span>)}<div className="visual-panel"><p>SELECTED POLE</p><strong>P-206 • 2114585</strong><div className="mini-pole"><span /><i className="wire-one" /><i className="wire-two" /><i className="wire-three" /></div><div className="measure-row"><span>PRIMARY-1</span><b>10.174 m</b></div><div className="measure-row"><span>NEUTRAL</span><b>7.662 m</b></div><div className="measure-row"><span>COMM-1</span><b>6.619 m</b></div></div></div></div></section></main>;
}

