"use client";
import { useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";

export function FirstAdminSetup({ identityEmail, displayName }: { identityEmail: string; displayName: string }) {
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function activate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not activate the administrator account");
      window.location.reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Activation failed"); setBusy(false); }
  }
  return <main className="access-shell"><div className="brand-lockup"><span className="brand-mark"><span /></span><span><strong>POWERTEK</strong><small>POLE INTELLIGENCE</small></span></div><section className="access-card setup-card"><span className="access-icon"><ShieldCheck /></span><p className="eyebrow">FIRST ADMINISTRATOR</p><h1>Activate the secure portal</h1><p>Signed in as <strong>{displayName}</strong><br /><span>{identityEmail}</span></p><form onSubmit={activate}><label><KeyRound /> One-time setup code<input autoFocus required value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter setup code" autoComplete="one-time-code" /></label>{error && <div className="error-banner">{error}</div>}<button className="primary-cta" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <ShieldCheck />} Activate administrator</button></form><small>The code works only while no administrator exists. After activation, invite users by verified email and assign projects.</small></section></main>;
}
