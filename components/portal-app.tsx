"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PortalUser } from "@/lib/portal-types";
import { ImportDialog } from "@/components/import-dialog";
import {
  Building2, ChevronRight, CircleUserRound, CloudUpload, Download, FolderKanban,
  Gauge, HardDrive, LogOut, MapPinned, Plus, RefreshCw, Search, ShieldCheck, UsersRound,
} from "lucide-react";

type ClientRow = { id: string; name: string; code: string; status: string; project_count: number };
export type ProjectRow = {
  id: string; client_id: string; client_name: string; name: string; code: string; description: string;
  location_label: string; status: string; pole_count: number; complete_count: number; attachment_count: number;
};
type UserRow = { id: string; email: string; display_name: string; role: string; status: string; project_names: string; project_count: number };
type Dashboard = { user: PortalUser; clients: ClientRow[]; projects: ProjectRow[]; users: UserRow[] };

const emptyDashboard: Dashboard = { user: {} as PortalUser, clients: [], projects: [], users: [] };

function Brand() {
  return <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span /></span><span><strong>POWERTEK</strong><small>POLE INTELLIGENCE</small></span></div>;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export function PortalApp({ initialUser, signOutPath }: { initialUser: PortalUser; signOutPath: string }) {
  const [data, setData] = useState<Dashboard>({ ...emptyDashboard, user: initialUser });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"projects" | "clients" | "users" | "import">("projects");
  const [clientForm, setClientForm] = useState({ name: "", code: "" });
  const [projectForm, setProjectForm] = useState({ clientId: "", name: "", code: "", locationLabel: "" });
  const [userForm, setUserForm] = useState({ displayName: "", email: "", role: "client", projectIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await jsonRequest<Dashboard>("/api/dashboard")); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load the workspace"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredProjects = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return data.projects;
    return data.projects.filter((item) => [item.name, item.code, item.client_name, item.location_label].some((field) => String(field).toLowerCase().includes(value)));
  }, [data.projects, query]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool?.({
        name: "list_assigned_pole_projects",
        title: "List pole projects",
        description: "List the pole survey projects visible to the signed-in user.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async () => ({ projects: data.projects.map((p) => ({ id: p.id, client: p.client_name, name: p.name, poles: Number(p.pole_count) })) }),
      }, { signal: lifecycle.signal });
      await context.registerTool?.({
        name: "open_pole_project",
        title: "Open pole project",
        description: "Open an assigned pole survey project by its exact project id.",
        inputSchema: { type: "object", properties: { projectId: { type: "string" } }, required: ["projectId"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const projectId = String((input as { projectId?: unknown })?.projectId ?? "");
          if (!data.projects.some((p) => p.id === projectId)) throw new Error("Project is not assigned to this account");
          window.location.assign(`/projects/${encodeURIComponent(projectId)}`);
          return { opened: true, projectId };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [data.projects]);

  async function createClient(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await jsonRequest("/api/admin/clients", { method: "POST", body: JSON.stringify(clientForm) });
      setClientForm({ name: "", code: "" }); setNotice("Client created"); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create client"); }
    finally { setSaving(false); }
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await jsonRequest("/api/admin/projects", { method: "POST", body: JSON.stringify(projectForm) });
      setProjectForm({ clientId: "", name: "", code: "", locationLabel: "" }); setNotice("Project created"); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create project"); }
    finally { setSaving(false); }
  }

  async function saveUser(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await jsonRequest("/api/admin/users", { method: "POST", body: JSON.stringify(userForm) });
      setUserForm({ displayName: "", email: "", role: "client", projectIds: [] }); setNotice("User access saved"); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save user"); }
    finally { setSaving(false); }
  }

  const totalPoles = data.projects.reduce((sum, item) => sum + Number(item.pole_count), 0);
  const totalAttachments = data.projects.reduce((sum, item) => sum + Number(item.attachment_count), 0);
  const isAdmin = data.user.role === "admin";

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <Brand />
        <div className="portal-header-right">
          <span className="role-pill"><ShieldCheck size={13} /> {isAdmin ? "Administrator" : "Client access"}</span>
          <span className="account-name"><CircleUserRound size={17} /><span><strong>{data.user.displayName}</strong><small>{data.user.email}</small></span></span>
          <a className="icon-button" href={signOutPath} target="_top" aria-label="Sign out"><LogOut size={17} /></a>
        </div>
      </header>
      <div className="portal-layout">
        <aside className="portal-sidebar">
          <div className="sidebar-kicker">WORKSPACE</div>
          <nav>
            <button className={tab === "projects" ? "active" : ""} onClick={() => setTab("projects")}><FolderKanban /> Projects <span>{data.projects.length}</span></button>
            {isAdmin && <button className={tab === "clients" ? "active" : ""} onClick={() => setTab("clients")}><Building2 /> Clients <span>{data.clients.length}</span></button>}
            {isAdmin && <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><UsersRound /> User access <span>{data.users.length}</span></button>}
            {isAdmin && <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}><CloudUpload /> Upload data</button>}
          </nav>
          <div className="sidebar-help"><HardDrive /><p><strong>Original-file storage</strong><span>Photos are served at their uploaded resolution for sharp zoom.</span></p></div>
        </aside>
        <section className="portal-main">
          {notice && <div className="notice-toast">{notice}</div>}
          <div className="workspace-title">
            <div><p className="eyebrow">{isAdmin ? "ADMIN CONTROL CENTER" : "ASSIGNED WORKSPACE"}</p><h1>{tab === "projects" ? "Pole survey projects" : tab === "clients" ? "Client portfolio" : tab === "users" ? "User access" : "Project data upload"}</h1><p>{tab === "projects" ? "Open a project to view satellite locations, original photos, measured heights, and engineering models." : tab === "clients" ? "Organize every customer into one or more separate projects." : tab === "users" ? "Invite by verified email and assign only the projects each client may access." : "Upload one location spreadsheet, measurement JSON, and original-quality pole photos."}</p></div>
            <button className="ghost-button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /> Refresh</button>
          </div>
          {error && <div className="error-banner">{error}<button onClick={() => setError("")}>×</button></div>}

          {tab === "projects" && <>
            <section className="stats-grid">
              <article><span><FolderKanban /></span><p><small>ACTIVE PROJECTS</small><strong>{data.projects.length}</strong></p></article>
              <article><span><MapPinned /></span><p><small>POLE LOCATIONS</small><strong>{totalPoles.toLocaleString()}</strong></p></article>
              <article><span><Gauge /></span><p><small>MEASURED POINTS</small><strong>{totalAttachments.toLocaleString()}</strong></p></article>
              <article><span><Download /></span><p><small>EXPORTS</small><strong>Single + bulk</strong></p></article>
            </section>
            <div className="project-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, project, or location" /></label>{isAdmin && <button className="orange-button" onClick={() => setTab("import")}><CloudUpload /> Upload project data</button>}</div>
            {loading ? <div className="loading-panel"><span /><p>Loading project workspace…</p></div> : filteredProjects.length === 0 ? <div className="empty-panel"><MapPinned /><h2>{data.projects.length ? "No matching projects" : "Create your first pole project"}</h2><p>{isAdmin ? "Add a client, create a project, then upload the location spreadsheet, JSON, and original images." : "Your administrator has not assigned a project yet."}</p>{isAdmin && <button className="orange-button" onClick={() => setTab("clients")}><Plus /> Add first client</button>}</div> : <section className="project-grid">{filteredProjects.map((project) => <button className="project-card" key={project.id} onClick={() => window.location.assign(`/projects/${project.id}`)}><div className="project-card-top"><span className="project-code">{project.code.slice(0, 5)}</span><span className="project-status"><i /> Active</span></div><p>{project.client_name}</p><h2>{project.name}</h2><span className="project-location"><MapPinned /> {project.location_label || "Location from survey coordinates"}</span><div className="project-metrics"><span><b>{Number(project.pole_count).toLocaleString()}</b> poles</span><span><b>{Number(project.complete_count).toLocaleString()}</b> photos</span><span><b>{Number(project.attachment_count).toLocaleString()}</b> points</span></div><footer><span>Open project map</span><ChevronRight /></footer></button>)}</section>}
          </>}

          {tab === "clients" && isAdmin && <section className="admin-two-col"><div className="admin-card"><div className="card-heading"><span><Building2 /></span><div><p className="eyebrow">NEW CLIENT</p><h2>Create client workspace</h2></div></div><form onSubmit={createClient} className="admin-form"><label>Client name<input required value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} placeholder="Northline Utilities" /></label><label>Client code<input value={clientForm.code} onChange={(e) => setClientForm({ ...clientForm, code: e.target.value })} placeholder="NORTHLINE" /></label><button className="orange-button" disabled={saving}><Plus /> Create client</button></form></div><div className="admin-list-card"><div className="list-heading"><h2>All clients</h2><span>{data.clients.length}</span></div>{data.clients.map((client) => <div className="admin-list-row" key={client.id}><span className="client-monogram">{client.name.slice(0, 2).toUpperCase()}</span><p><strong>{client.name}</strong><small>{client.code} • {client.project_count} projects</small></p><span className="active-tag">Active</span></div>)}</div><div className="admin-card project-create-card"><div className="card-heading"><span><FolderKanban /></span><div><p className="eyebrow">NEW PROJECT</p><h2>Add a project</h2></div></div><form onSubmit={createProject} className="admin-form form-grid"><label>Client<select required value={projectForm.clientId} onChange={(e) => setProjectForm({ ...projectForm, clientId: e.target.value })}><option value="">Choose client</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Project name<input required value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Fort Nelson 2026 Survey" /></label><label>Project code<input value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} placeholder="FN-2026" /></label><label>Location label<input value={projectForm.locationLabel} onChange={(e) => setProjectForm({ ...projectForm, locationLabel: e.target.value })} placeholder="Fort Nelson, BC" /></label><button className="orange-button" disabled={saving}><Plus /> Create project</button></form></div></section>}

          {tab === "users" && isAdmin && <section className="admin-two-col"><div className="admin-card"><div className="card-heading"><span><UsersRound /></span><div><p className="eyebrow">CLIENT ACCESS</p><h2>Invite or update user</h2></div></div><form onSubmit={saveUser} className="admin-form"><label>Display name<input value={userForm.displayName} onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })} placeholder="Client engineer" /></label><label>Verified email<input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="engineer@client.com" /></label><label>Role<select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value, projectIds: e.target.value === "admin" ? [] : userForm.projectIds })}><option value="client">Client user</option><option value="admin">Administrator</option></select></label>{userForm.role === "client" && <fieldset><legend>Assigned projects</legend>{data.projects.map((project) => <label className="check-row" key={project.id}><input type="checkbox" checked={userForm.projectIds.includes(project.id)} onChange={(e) => setUserForm({ ...userForm, projectIds: e.target.checked ? [...userForm.projectIds, project.id] : userForm.projectIds.filter((id) => id !== project.id) })} /><span><strong>{project.name}</strong><small>{project.client_name}</small></span></label>)}</fieldset>}<button className="orange-button" disabled={saving}><ShieldCheck /> Save access</button></form></div><div className="admin-list-card"><div className="list-heading"><h2>Authorized users</h2><span>{data.users.length}</span></div>{data.users.map((user) => <div className="admin-list-row" key={user.id}><span className="client-monogram user">{user.display_name.slice(0, 2).toUpperCase()}</span><p><strong>{user.display_name}</strong><small>{user.email}</small><em>{user.role === "admin" ? "All projects" : user.project_names || "No project"}</em></p><span className={user.role === "admin" ? "admin-tag" : "active-tag"}>{user.role}</span></div>)}</div></section>}

          {tab === "import" && isAdmin && <ImportDialog projects={data.projects} onComplete={async (message) => { setNotice(message); await load(); }} />}
        </section>
      </div>
    </main>
  );
}
