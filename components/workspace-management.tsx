"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, Check, FolderKanban, MailPlus, Plus, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import type { PortalUser } from "@/lib/portal-types";
import type { ProjectAssignment } from "@/lib/access";
import type { DashboardProject } from "@/lib/dashboard";
import { summarizeProjects } from "@/lib/dashboard";
import { workspaceRequest, WorkspaceRequestError } from "@/lib/workspace-request";

export type ClientRow = { id: string; name: string; code: string; status: string; project_count: number };
export type UserRow = { id: string; email: string; display_name: string; role: string; status: string; project_names: string; project_count: number; invitation_status: string; invited_at?: string; permissions?: { manageClients: boolean }; assignments: ProjectAssignment[] };
type Feedback = { message: string; field?: string } | null;
function useFormFeedback() {
  const [error, setError] = useState<Feedback>(null);
  const [notice, setNotice] = useState("");
  return { error, setError, notice, setNotice, clear: () => { setError(null); setNotice(""); }, fail: (value: unknown) => setError({ message: value instanceof Error ? value.message : "Could not save changes. Try again.", field: value instanceof WorkspaceRequestError ? value.field : undefined }) };
}
function FeedbackMessage({ feedback, prefix }: { feedback: ReturnType<typeof useFormFeedback>; prefix: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedback.error) ref.current?.focus(); }, [feedback.error]);
  return <>{feedback.error && <div className="management-error" role="alert" tabIndex={-1} ref={ref}><strong>There is a problem</strong><p>{feedback.error.field ? <a href={`#${prefix}-${feedback.error.field}`}>{feedback.error.message}</a> : feedback.error.message}</p></div>}{feedback.notice && <div className="workspace-alert success" role="status"><Check size={16} /><span>{feedback.notice}</span></div>}</>;
}
function attributes(feedback: ReturnType<typeof useFormFeedback>, prefix: string, field: string) { return { id: `${prefix}-${field}`, "aria-invalid": feedback.error?.field === field || undefined }; }

export function ClientManager({ clients, projects, isAdmin, onChanged, onViewProjects, onNewProject }: { clients: ClientRow[]; projects: DashboardProject[]; isAdmin: boolean; onChanged: () => Promise<void>; onViewProjects: (id: string) => void; onNewProject: (id: string) => void }) {
  const [form, setForm] = useState({ id: "", name: "", code: "", status: "active" });
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("active"); const [busy, setBusy] = useState(false);
  const feedback = useFormFeedback(); const formRef = useRef<HTMLElement>(null);
  const visible = clients.filter((client) => (status === "all" || client.status === status) && [client.name, client.code].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  function edit(client?: ClientRow) {
    feedback.clear(); setForm(client ? { id: client.id, name: client.name, code: client.code, status: client.status } : { id: "", name: "", code: "", status: "active" });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById("client-name")?.focus();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); feedback.clear();
    try {
      await workspaceRequest("/api/admin/clients", { method: "POST", body: JSON.stringify(form) });
      await onChanged(); feedback.setNotice(form.id ? "Client details updated." : "Client created. You can add a project now or later.");
      if (!form.id) setForm({ id: "", name: "", code: "", status: "active" });
    } catch (error) { feedback.fail(error); }
    finally { setBusy(false); }
  }
  return <>
    <section className="workspace-panel management-editor" ref={formRef}>
      <div className="panel-title"><div><p className="eyebrow">CLIENT MANAGEMENT</p><h2>{form.id ? "Edit client" : "Create a client"}</h2></div><Building2 size={22} /></div>
      <p className="panel-description">A client is a company or customer record. Create it independently; people are invited separately in People &amp; access.</p>
      <FeedbackMessage feedback={feedback} prefix="client" />
      <form className="workspace-form management-form-grid" onSubmit={submit} aria-label={form.id ? "Edit client" : "Create client"}>
        <label>Client name<input {...attributes(feedback, "client", "name")} required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Client company name" /></label>
        <label>Client code <span className="field-optional">(optional)</span><input {...attributes(feedback, "client", "code")} maxLength={32} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Generated from the name if blank" /></label>
        {form.id && <label>Status<select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="archived">Archived</option></select><small>Archiving keeps existing projects and records. Restore the client to add new projects.</small></label>}
        <div className="management-form-actions"><button className="workspace-button primary" disabled={busy} aria-busy={busy}><Plus size={16} />{busy ? "Saving…" : form.id ? "Save client" : "Create client"}</button>{form.id && <button type="button" className="workspace-button secondary" onClick={() => edit()}>Cancel edit</button>}</div>
      </form>
    </section>
    <div className="management-directory-toolbar"><label className="workspace-search"><Search size={16} /><input aria-label="Search clients" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients by name or code" /></label><select aria-label="Client status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active clients</option><option value="archived">Archived clients</option><option value="all">All clients</option></select><span>{visible.length} clients</span><button className="workspace-button secondary" onClick={() => edit()}><Plus size={16} />New client</button></div>
    <div className="client-portfolio-grid">{visible.map((client) => {
      const summary = summarizeProjects(projects.filter((project) => project.client_id === client.id));
      return <article className="workspace-panel client-portfolio-card" key={client.id}><div className="client-card-heading"><span className="client-avatar">{client.name.slice(0, 2).toUpperCase()}</span><span className={`status-badge ${client.status === "active" ? "active" : ""}`}>{client.status}</span></div><h2>{client.name}</h2><p>{client.code}</p><div className="client-card-stats"><span><strong>{client.project_count}</strong>{isAdmin ? "Projects" : "Visible projects"}</span><span><strong>{summary.poles.toLocaleString()}</strong>Visible poles</span></div><div className="management-card-actions"><button className="text-button" onClick={() => edit(client)} aria-label={`Edit ${client.name}`}>Edit client</button>{isAdmin && client.status === "active" && <button className="text-button" onClick={() => onNewProject(client.id)}>Add project <Plus size={14} /></button>}</div><button className="text-button" onClick={() => onViewProjects(client.id)}>Open client projects <ArrowUpRight size={16} /></button></article>;
    })}</div>
    {!visible.length && <div className="workspace-empty"><Building2 size={30} /><h3>{clients.length ? "No matching clients" : "Start with a client record"}</h3><p>{clients.length ? "Try a different name or status filter." : "Add a client above. No project or user invitation is required."}</p></div>}
  </>;
}

export function ProjectEditor({ clients, project, initialClientId = "", onChanged, onClose }: { clients: ClientRow[]; project?: DashboardProject; initialClientId?: string; onChanged: () => Promise<void>; onClose: (saved?: boolean) => void }) {
  const [form, setForm] = useState({ id: project?.id || "", clientId: project?.client_id || initialClientId, name: project?.name || "", code: project?.code || "", locationLabel: project?.location_label || "", status: project?.status || "active" });
  const [newClient, setNewClient] = useState(false); const [clientName, setClientName] = useState(""); const [clientCode, setClientCode] = useState(""); const [busy, setBusy] = useState(false); const [clientBusy, setClientBusy] = useState(false);
  const feedback = useFormFeedback(); const inlineFeedback = useFormFeedback();
  async function addClient(event: React.FormEvent) {
    event.preventDefault(); setClientBusy(true); inlineFeedback.clear();
    try {
      const client = await workspaceRequest<ClientRow>("/api/admin/clients", { method: "POST", body: JSON.stringify({ name: clientName, code: clientCode }) });
      await onChanged(); setForm((previous) => ({ ...previous, clientId: client.id })); setNewClient(false); setClientName(""); setClientCode(""); feedback.clear(); feedback.setNotice("Client created and selected. Continue with your project details.");
    } catch (error) { inlineFeedback.fail(error); }
    finally { setClientBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); feedback.clear();
    try { await workspaceRequest("/api/admin/projects", { method: "POST", body: JSON.stringify(form) }); await onChanged(); onClose(true); }
    catch (error) { feedback.fail(error); }
    finally { setBusy(false); }
  }
  const choices = clients.filter((client) => client.status === "active" || client.id === project?.client_id);
  return <section className="workspace-panel management-editor"><div className="panel-title"><div><p className="eyebrow">PROJECT MANAGEMENT</p><h2>{project ? "Edit project" : "Create a project"}</h2></div><button className="icon-button" aria-label="Close project form" onClick={() => onClose()}><X size={18} /></button></div>
    <p className="panel-description">Choose the client that owns the project. You can create a client here, and assign people later.</p>
    <FeedbackMessage feedback={feedback} prefix="project" />
    <form className="workspace-form management-form-grid" onSubmit={submit} aria-label={project ? "Edit project" : "Create project"}>
      <div className="project-client-field"><label>Client<select aria-label="Client" {...attributes(feedback, "project", "clientId")} required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Choose a client</option>{choices.map((client) => <option key={client.id} value={client.id}>{client.name}{client.status === "archived" ? " (archived)" : ""}</option>)}</select></label><button type="button" className="text-button inline-add-client" onClick={() => setNewClient(!newClient)} aria-expanded={newClient}><Plus size={14} />Add a new client</button></div>
      <label>Project name<input {...attributes(feedback, "project", "name")} required maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Survey project name" /></label>
      <label>Project code <span className="field-optional">(optional)</span><input {...attributes(feedback, "project", "code")} maxLength={32} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Generated from the name if blank" /></label>
      <label>Location <span className="field-optional">(optional)</span><input {...attributes(feedback, "project", "locationLabel")} maxLength={160} value={form.locationLabel} onChange={(e) => setForm({ ...form, locationLabel: e.target.value })} placeholder="City, region" /></label>
      {project && <label>Status<select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="archived">Archived</option></select><small>Archiving preserves project data and existing assignments.</small></label>}
      <div className="management-form-actions"><button className="workspace-button primary" disabled={busy || clientBusy || !form.clientId} aria-busy={busy}><FolderKanban size={16} />{busy ? "Saving…" : project ? "Save project" : "Create project"}</button><button type="button" className="workspace-button secondary" onClick={() => onClose()}>Cancel</button></div>
      {!choices.length && <p className="management-form-hint">Add a client below to continue. Your project details will stay here.</p>}
    </form>
    {newClient && <div className="inline-client-panel"><h3>Create and select a client</h3><FeedbackMessage feedback={inlineFeedback} prefix="inline-client" /><form className="workspace-form" onSubmit={addClient} aria-label="Create client inline"><label>New client name<input {...attributes(inlineFeedback, "inline-client", "name")} required maxLength={120} value={clientName} onChange={(e) => setClientName(e.target.value)} /></label><label>New client code <span className="field-optional">(optional)</span><input {...attributes(inlineFeedback, "inline-client", "code")} maxLength={32} value={clientCode} onChange={(e) => setClientCode(e.target.value)} /></label><div className="management-form-actions"><button className="workspace-button secondary" disabled={clientBusy}>{clientBusy ? "Creating…" : "Create and select client"}</button><button type="button" className="text-button" onClick={() => setNewClient(false)}>Cancel</button></div></form></div>}
  </section>;
}

export function PeopleManager({ users, projects, currentUser, onChanged }: { users: UserRow[]; projects: DashboardProject[]; currentUser: PortalUser; onChanged: () => Promise<void> }) {
  const blank = { displayName: "", email: "", role: "client", status: "active", manageClients: false, assignments: [] as ProjectAssignment[] };
  const [form, setForm] = useState(blank); const [selected, setSelected] = useState<UserRow | null>(null); const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(""); const [roleFilter, setRoleFilter] = useState("all"); const [statusFilter, setStatusFilter] = useState("all");
  const feedback = useFormFeedback(); const formRef = useRef<HTMLElement>(null);
  const visible = users.filter((user) => (roleFilter === "all" || user.role === roleFilter) && (statusFilter === "all" || user.status === statusFilter) && [user.email, user.display_name].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())));
  function edit(user?: UserRow) {
    setSelected(user || null); feedback.clear(); setForm(user ? { displayName: user.display_name, email: user.email, role: user.role, status: user.status, manageClients: user.permissions?.manageClients === true, assignments: user.assignments || [] } : blank);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); document.getElementById("person-displayName")?.focus();
  }
  async function submit(event: React.FormEvent, invite = !selected) {
    event.preventDefault(); setBusy(true); feedback.clear();
    try {
      await workspaceRequest("/api/admin/users", { method: "POST", body: JSON.stringify({ ...form, sendInvite: invite }) });
      await onChanged(); feedback.setNotice(invite ? "Invitation email sent. Projects can be assigned whenever you’re ready." : "User details and permissions saved.");
      if (!selected) setForm(blank);
    } catch (error) { if (error instanceof WorkspaceRequestError && error.accessSaved) await onChanged(); feedback.fail(error); }
    finally { setBusy(false); }
  }
  const self = selected?.id === currentUser.id;
  return <div className="people-layout"><section className="workspace-panel" ref={formRef} id="user-access-form"><div className="panel-title"><div><p className="eyebrow">PEOPLE MANAGEMENT</p><h2>{selected ? "Manage person" : "Invite someone new"}</h2></div><MailPlus size={22} /></div>
    <p className="panel-description">{selected ? "Update their role, status, and project access here." : "Send an invitation now. Project assignments are optional and can be added or removed later."}</p>
    <FeedbackMessage feedback={feedback} prefix="person" />
    <form className="workspace-form" onSubmit={(event) => void submit(event)} aria-label={selected ? "Manage person" : "Invite person"}>
      <label>Full name<input {...attributes(feedback, "person", "displayName")} required maxLength={120} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Full name" /></label>
      <label>Work email<input {...attributes(feedback, "person", "email")} type="email" required readOnly={Boolean(selected)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" /></label>
      <label>Workspace role<select aria-label="Workspace role" disabled={self} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, manageClients: false, assignments: e.target.value === "admin" ? [] : form.assignments.map((a) => ({ ...a, canUpload: false })) })}><option value="client">Client · assigned projects only</option><option value="staff">Internal team · custom permissions</option><option value="admin">Administrator · full access</option></select></label>
      {selected && <label>Account status<select aria-label="Account status" disabled={self} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="disabled">Disabled</option></select><small>{self ? "Your own administrator access stays enabled." : "Disabling immediately blocks access and keeps the user record and assignments."}</small></label>}
      {form.role === "admin" ? <div className="permission-note"><ShieldCheck size={17} />Administrators manage all clients, projects, people, and uploads.</div> : <fieldset className="project-assignments"><legend>Assigned projects <span className="field-optional">(optional)</span></legend><p>{form.assignments.length ? `${form.assignments.length} projects selected. Viewing is included.` : "No projects selected. This person can sign in but will see no project data until you assign it."}</p>{projects.map((project) => {
        const assignment = form.assignments.find((a) => a.projectId === project.id);
        return <div className="assignment-row" key={project.id}><label><input type="checkbox" checked={Boolean(assignment)} onChange={(e) => setForm({ ...form, assignments: e.target.checked ? [...form.assignments, { projectId: project.id, canUpload: false }] : form.assignments.filter((a) => a.projectId !== project.id) })} /><span><strong>{project.name}</strong><small>{project.client_name}</small></span></label>{form.role === "staff" && <label className="upload-permission"><input type="checkbox" disabled={!assignment} checked={assignment?.canUpload || false} onChange={(e) => setForm({ ...form, assignments: form.assignments.map((a) => a.projectId === project.id ? { ...a, canUpload: e.target.checked } : a) })} />Upload / edit</label>}</div>;
      })}{!projects.length && <p>You can invite this person now and assign projects after they’re created.</p>}</fieldset>}
      {form.role === "staff" && <label className="permission-checkbox"><input type="checkbox" checked={form.manageClients} onChange={(e) => setForm({ ...form, manageClients: e.target.checked })} /><span><strong>Manage clients</strong><small>Create and edit client records. Project data still requires an assignment.</small></span></label>}
      <button className="workspace-button primary" disabled={busy} aria-busy={busy}>{busy ? <RefreshCw size={16} className="spin" /> : selected ? <ShieldCheck size={16} /> : <MailPlus size={16} />}{busy ? "Saving…" : selected ? "Save permissions" : "Send invitation"}</button>
      {selected && <div className="edit-user-actions">{selected.invitation_status !== "accepted" && form.status === "active" && <button type="button" className="workspace-button secondary" disabled={busy} onClick={(event) => void submit(event, true)}>Send invitation email</button>}<button type="button" className="text-button" onClick={() => edit()}>Cancel edit</button></div>}
    </form>
  </section><section className="workspace-panel people-directory"><div className="panel-title"><div><p className="eyebrow">WORKSPACE DIRECTORY</p><h2>People &amp; access</h2></div><button className="workspace-button secondary" onClick={() => edit()}><Plus size={15} />New invitation</button></div>
    <div className="people-search"><label className="workspace-search"><Search size={16} /><input aria-label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" /></label><div><select aria-label="Filter people by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option><option value="admin">Administrators</option><option value="staff">Internal team</option><option value="client">Clients</option></select><select aria-label="Filter people by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div></div>
    {visible.map((person) => <article className="directory-person" key={person.id}><span className="person-avatar">{person.display_name.slice(0, 1)}</span><div><h3>{person.display_name}{person.id === currentUser.id ? " (you)" : ""}</h3><p>{person.email}</p><div className="person-tags"><span className="status-badge">{person.role === "staff" ? "Internal team" : person.role}</span><span className={`invitation-status ${person.invitation_status}`}>{person.invitation_status || "pending"}</span>{person.status === "disabled" && <span className="status-badge">Disabled</span>}</div><small>{person.role === "admin" ? "All projects and permissions" : person.project_names || "No projects assigned · access can be added later"}</small></div><button className="text-button" onClick={() => edit(person)} aria-label={`Manage ${person.display_name}`}>Manage</button></article>)}
    {!visible.length && <div className="workspace-empty"><MailPlus size={26} /><h3>{users.length ? "No matching people" : "Invite your first person"}</h3><p>Invitations and project assignments can happen independently.</p></div>}
  </section></div>;
}
