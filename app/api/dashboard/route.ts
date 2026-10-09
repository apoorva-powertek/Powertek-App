import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ProjectSummaryRow = {
  id: string; client_id: string; name: string; code: string; description: string | null;
  location_label: string | null; status: string; clients?: { name: string } | null;
  poles?: Array<{ status: string; attachments?: Array<{ id: string }> }>;
};
type ClientSummaryRow = { id: string; name: string; code: string; status: string; projects?: Array<{ id: string }> };
type UserSummaryRow = {
  id: string; email: string; display_name: string; role: string; status: string;
  user_projects?: Array<{ projects?: { name: string } | null }>;
};

export async function GET(request: Request) {
  try {
    const { client, user } = await requirePortalUser(request);
    const projectsResult = await client.from("projects")
      .select("id,client_id,name,code,description,location_label,status,clients!inner(name),poles(id,status,attachments(id))")
      .order("name");
    if (projectsResult.error) throw projectsResult.error;
    const projects = ((projectsResult.data ?? []) as ProjectSummaryRow[]).map((row) => ({
      id: row.id, client_id: row.client_id, client_name: row.clients?.name ?? "", name: row.name, code: row.code,
      description: row.description, location_label: row.location_label, status: row.status,
      pole_count: row.poles?.length ?? 0,
      complete_count: row.poles?.filter((pole) => pole.status === "complete").length ?? 0,
      attachment_count: row.poles?.reduce((sum, pole) => sum + (pole.attachments?.length ?? 0), 0) ?? 0,
    }));
    let clients: unknown[] = [];
    let users: unknown[] = [];
    if (user.role === "admin") {
      const [clientResult, userResult] = await Promise.all([
        client.from("clients").select("id,name,code,status,projects(id)").order("name"),
        client.from("portal_users").select("id,email,display_name,role,status,user_projects(projects(name))").order("display_name"),
      ]);
      if (clientResult.error) throw clientResult.error;
      if (userResult.error) throw userResult.error;
      clients = ((clientResult.data ?? []) as ClientSummaryRow[]).map((row) => ({ id: row.id, name: row.name, code: row.code, status: row.status, project_count: row.projects?.length ?? 0 }));
      users = ((userResult.data ?? []) as UserSummaryRow[]).map((row) => ({
        id: row.id, email: row.email, display_name: row.display_name, role: row.role, status: row.status,
        project_names: (row.user_projects ?? []).map((entry) => entry.projects?.name).filter(Boolean).join(" • "),
        project_count: row.user_projects?.length ?? 0,
      }));
    }
    return Response.json({ user, clients, projects, users });
  } catch (error) { return authErrorResponse(error); }
}

