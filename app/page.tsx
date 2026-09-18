import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { portalHasUsers, resolvePortalUser } from "@/lib/portal-auth";
import { PortalApp } from "@/components/portal-app";
import { FirstAdminSetup } from "@/components/first-admin-setup";
import { ArrowRight, Database, LockKeyhole, MapPinned, Ruler, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function Brand() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span><strong>POWERTEK</strong><small>POLE INTELLIGENCE</small></span>
    </div>
  );
}

export default async function Home() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return (
      <main className="login-shell">
        <div className="login-grid" aria-hidden="true" />
        <header className="login-header"><Brand /><span className="secure-label"><ShieldCheck size={14} /> Secure client portal</span></header>
        <section className="login-hero">
          <div className="login-copy">
            <p className="eyebrow">FIELD DATA, ENGINEERED</p>
            <h1>Every pole. Every height.<br /><em>One exact view.</em></h1>
            <p className="login-lede">A protected workspace for full-resolution pole imagery, measured attachments, satellite locations, and SPIDA-style engineering profiles.</p>
            <a className="primary-cta" href={chatGPTSignInPath("/")} target="_top">Sign in to your portal <ArrowRight size={17} /></a>
            <p className="login-note"><LockKeyhole size={13} /> Access is limited to projects assigned by your administrator.</p>
          </div>
          <div className="login-visual" aria-label="Pole survey portal feature preview">
            <div className="visual-top"><span>LIVE PROJECT VIEW</span><span className="status-dot">Protected</span></div>
            <div className="visual-map">
              <span className="map-road road-a" /><span className="map-road road-b" />
              {["P-204", "P-205", "P-206", "P-207", "P-208"].map((label, index) => <span key={label} className={`demo-pin pin-${index + 1}`}><i />{label}</span>)}
              <div className="visual-panel">
                <p>SELECTED POLE</p><strong>P-206 • 2114585</strong>
                <div className="mini-pole"><span /><i className="wire-one" /><i className="wire-two" /><i className="wire-three" /></div>
                <div className="measure-row"><span>PRIMARY-1</span><b>10.174 m</b></div>
                <div className="measure-row"><span>NEUTRAL</span><b>7.662 m</b></div>
                <div className="measure-row"><span>COMM-1</span><b>6.619 m</b></div>
              </div>
            </div>
          </div>
        </section>
        <section className="login-features">
          <article><MapPinned /><span><strong>Satellite locations</strong><small>Named pole points by client and project</small></span></article>
          <article><Ruler /><span><strong>Exact measurements</strong><small>Photo overlays and SPIDA profiles</small></span></article>
          <article><Database /><span><strong>Original-quality files</strong><small>Sharp zoom and controlled downloads</small></span></article>
        </section>
      </main>
    );
  }

  let user = null;
  let serviceError = false;
  let hasUsers = true;
  try {
    hasUsers = await portalHasUsers();
    user = await resolvePortalUser();
  } catch (error) {
    console.error(error);
    serviceError = true;
  }
  if (!serviceError && !hasUsers) return <FirstAdminSetup identityEmail={identity.email} displayName={identity.displayName} />;
  if (!user) {
    return (
      <main className="access-shell">
        <Brand />
        <section className="access-card">
          <span className="access-icon"><LockKeyhole /></span>
          <p className="eyebrow">{serviceError ? "SERVICE UNAVAILABLE" : "ACCESS PENDING"}</p>
          <h1>{serviceError ? "The portal is not ready yet" : "Your account is signed in"}</h1>
          <p>{serviceError ? "Please try again after the administrator completes portal setup." : <>Ask the Powertek administrator to add <strong>{identity.email}</strong> and assign a project.</>}</p>
          <a href={chatGPTSignOutPath("/")} target="_top" className="secondary-cta">Sign out</a>
        </section>
      </main>
    );
  }
  return <PortalApp initialUser={user} signOutPath={chatGPTSignOutPath("/")} />;
}
