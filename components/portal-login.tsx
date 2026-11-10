"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation avoids the production Vinext router failure; see docs/home-experience.md. */
import Image from "next/image";

import { type ReactNode, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCheck, ClipboardCheck, Download, Eye, EyeOff, FolderKanban, LockKeyhole, Mail, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { ThemeControl } from "@/components/theme-control";
import { createBrowserSupabase } from "@/lib/supabase";

function Brand() { return <div className="portal-brand"><Image src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority /></div>; }

export function PasswordUpdate({ invitation = false }: { invitation?: boolean }) {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (password !== confirm) { setError("The passwords do not match."); return; } setBusy(true); try { const { error: updateError } = await createBrowserSupabase().auth.updateUser({ password }); if (updateError) throw updateError; window.location.replace("/portal"); } catch (err) { setError(err instanceof Error ? err.message : "Could not update the password"); } finally { setBusy(false); } }
  return <AuthFrame><section className="auth-form-panel"><h1>{invitation ? "Set your workspace password" : "Choose a new password"}</h1><p>{invitation ? "Finish setting up your invited account to open your assigned workspace." : "Use at least eight characters and choose a password you haven’t used here before."}</p><form className="portal-login-form" onSubmit={submit}><label>New password<span className="auth-input"><LockKeyhole size={17}/><input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={event=>setPassword(event.target.value)} aria-label="New password"/></span></label><label>Confirm password<span className="auth-input"><LockKeyhole size={17}/><input type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={event=>setConfirm(event.target.value)} aria-label="Confirm password"/></span></label>{error&&<p role="alert" className="login-feedback error">{error}</p>}<button className="primary-cta" disabled={busy} aria-busy={busy}>{busy?"Saving…":invitation?"Accept invitation":"Update password"}<ArrowRight size={17}/></button></form><p className="login-note"><ShieldCheck size={15}/>Your password protects access to your assigned projects.</p></section></AuthFrame>;
}

export function PortalLogin({ admin = false, initialMode = "signin" }: { admin?: boolean; initialMode?: "signin" | "reset" }) {
  const [mode, setMode] = useState<"signin" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createBrowserSupabase();
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
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

  return <AuthFrame admin={admin}><section className="auth-form-panel"><nav className="auth-role-tabs" aria-label="Sign-in workspace"><a href="/portal" aria-current={!admin?"page":undefined}>Client &amp; team</a><a href="/admin" aria-current={admin?"page":undefined}>Administration</a></nav><h1>{mode==="reset"?"Let’s get you back in.":admin?"Welcome back, admin.":"Your workspace awaits."}</h1><p>{mode==="reset"?"Enter your account email. We’ll send a link to choose a new password.":admin?"Sign in to manage your clients, team and project delivery.":"Sign in to explore your assigned projects, records and deliverables."}</p><form onSubmit={submit} className="portal-login-form"><label>Work email<span className="auth-input"><Mail size={17}/><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} aria-label="Work email" placeholder="you@company.com"/></span></label>{mode!=="reset"&&<label>Password<span className="auth-input"><LockKeyhole size={17}/><input type={showPassword?"text":"password"} minLength={8} autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} aria-label="Password" placeholder="Enter your password"/><button className="auth-password-toggle" type="button" aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}{error&&<p role="alert" aria-live="polite" className="login-feedback error">{error}</p>}{message&&<p role="status" className="login-feedback">{message}</p>}<button className="primary-cta" disabled={busy} aria-busy={busy}>{busy?"Please wait…":mode==="reset"?"Send reset email":"Sign in to your portal"}<ArrowRight size={17}/></button></form><div className="login-mode-links"><button onClick={()=>{setMode(mode==="signin"?"reset":"signin");setError("");setMessage("");}}>{mode==="signin"?"Forgot password?":"Back to sign in"}</button></div><p className="login-note"><LockKeyhole size={15}/>Access is by invitation. Use the email from your administrator to set your password.</p></section></AuthFrame>;
}

function AuthFrame({admin=false,children}:{admin?:boolean;children:ReactNode}){
 const items=admin?[{icon:UsersRound,title:'People & permissions',body:'Keep clients, employees and project access organised.'},{icon:ClipboardCheck,title:'Review before release',body:'Approve project updates before they reach your clients.'},{icon:CheckCheck,title:'A clear delivery process',body:'Publish reviewed work and notify assigned clients.'}]:[{icon:FolderKanban,title:'Your projects, together',body:'See the work assigned to your account in one place.'},{icon:MapPin,title:'Explore the evidence',body:'Connect locations, imagery and measured profiles.'},{icon:Download,title:'Take the work with you',body:'Download available originals, records and reports.'}];
 return <main className="auth-page"><header className="auth-header"><Brand/><div><a className="auth-home" href="/"><ArrowLeft size={16}/>Back to website</a><ThemeControl/></div></header><div className="auth-main">{children}<aside className="auth-context"><span className="auth-context-icon"><ShieldCheck size={25}/></span><h2>{admin?<>Keep every project<br/>moving forward.</>:<>From the field.<br/>Straight to your workspace.</>}</h2><p>{admin?'One place to organise your team, review project data and deliver work with confidence.':'A connected view of your survey data, from the complete project down to the smallest measured detail.'}</p><div className="auth-context-list">{items.map(({icon:Icon,title,body})=><div key={title}><Icon size={20}/><span><strong>{title}</strong><p>{body}</p></span></div>)}</div></aside></div><footer className="auth-footer"><span>© {new Date().getFullYear()} Powertek Utility Services</span><span><LockKeyhole size={13}/>Invitation-only project access</span></footer></main>;
}
