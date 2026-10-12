import { canManageClients } from "@/lib/access";
import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type ProjectRecord = { id: string; client_id: string; name: string; code: string; description: string; location_label: string; status: string; created_at: string; updated_at: string; clients: { name: string }; poles: { id: string; status: string; attachments: { id: string }[] }[] };
type ClientRecord = { id: string; name: string; code: string; status: string; projects: { id: string }[] };
type UserRecord = { id: string; email: string; display_name: string; role: string; status: string; permissions: { manageClients: boolean }; invitation_status: string; invited_at: string; user_projects: { project_id: string; can_upload: boolean; projects: { name: string } }[] };
export async function GET(request: Request) {
  try {
    const { client, user } = await requirePortalUser(request);
    const projectsResult = await client.from("projects")
      .select("id,client_id,name,code,description,location_label,status,created_at,updated_at,clients!inner(name),poles(id,status,attachments(id))").order("name");
    if (projectsResult.error) throw projectsResult.error;
    const assignments = await client.from("user_projects").select("project_id,can_upload").eq("user_id", user.id);
    if (assignments.error) throw assignments.error;
    const uploadProjects = new Set((assignments.data ?? []).filter((row) => row.can_upload).map((row) => row.project_id));
    const projects = ((projectsResult.data ?? []) as unknown as ProjectRecord[]).map((row) => ({
      id: row.id, client_id: row.client_id, client_name: row.clients?.name ?? "", name: row.name, code: row.code,
      description: row.description, location_label: row.location_label, status: row.status, created_at: row.created_at, updated_at: row.updated_at,
      can_upload: user.role === "admin" || (user.role === "staff" && uploadProjects.has(row.id)),
      pole_count: row.poles?.length ?? 0, complete_count: row.poles?.filter((pole) => pole.status === "complete").length ?? 0,
      attachment_count: row.poles?.reduce((sum, pole) => sum + (pole.attachments?.length ?? 0), 0) ?? 0,
    }));
    let clients: unknown[] = []; let users: unknown[] = [];
    if (canManageClients(user)) {
      const result = await client.from("clients").select("id,name,code,status,projects(id)").order("name");
      if (result.error) throw result.error;
      clients = ((result.data ?? []) as unknown as ClientRecord[]).map((row) => ({ id: row.id, name: row.name, code: row.code, status: row.status, project_count: row.projects?.length ?? 0 }));
    }
    if (user.role === "admin") {
      const result = await client.from("portal_users").select("id,email,display_name,role,status,permissions,invitation_status,invited_at,user_projects(project_id,can_upload,projects(name))").order("display_name");
      if (result.error) throw result.error;
      users = ((result.data ?? []) as unknown as UserRecord[]).map((row) => ({
        id: row.id, email: row.email, display_name: row.display_name, role: row.role, status: row.status,
        permissions: row.permissions, invitation_status: row.invitation_status, invited_at: row.invited_at,
        assignments: (row.user_projects ?? []).map((assignment) => ({ projectId: assignment.project_id, canUpload: assignment.can_upload })),
        project_names: (row.user_projects ?? []).map((entry) => entry.projects?.name).filter(Boolean).join(" • "), project_count: row.user_projects?.length ?? 0,
      }));
    }
    return Response.json({ user, clients, projects, users });
  } catch (error) { return authErrorResponse(error); }
}
