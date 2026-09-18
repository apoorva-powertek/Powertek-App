import { authErrorResponse, requirePortalUser } from "@/lib/portal-auth";
import { rawDb } from "@/db/raw";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  code: string;
  description: string;
  location_label: string;
  status: string;
  pole_count: number;
  complete_count: number;
  attachment_count: number;
};

export async function GET() {
  try {
    const user = await requirePortalUser();
    const db = rawDb();
    const projectSql = user.role === "admin"
      ? `
        SELECT p.id, p.client_id, c.name AS client_name, p.name, p.code, p.description,
          p.location_label, p.status,
          COUNT(DISTINCT po.id) AS pole_count,
          COUNT(DISTINCT CASE WHEN po.status = 'complete' THEN po.id END) AS complete_count,
          COUNT(a.id) AS attachment_count
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        LEFT JOIN poles po ON po.project_id = p.id
        LEFT JOIN attachments a ON a.pole_id = po.id
        GROUP BY p.id
        ORDER BY c.name, p.name`
      : `
        SELECT p.id, p.client_id, c.name AS client_name, p.name, p.code, p.description,
          p.location_label, p.status,
          COUNT(DISTINCT po.id) AS pole_count,
          COUNT(DISTINCT CASE WHEN po.status = 'complete' THEN po.id END) AS complete_count,
          COUNT(a.id) AS attachment_count
        FROM projects p
        JOIN clients c ON c.id = p.client_id
        JOIN user_projects up ON up.project_id = p.id AND up.user_id = ?
        LEFT JOIN poles po ON po.project_id = p.id
        LEFT JOIN attachments a ON a.pole_id = po.id
        GROUP BY p.id
        ORDER BY c.name, p.name`;
    const projects = user.role === "admin"
      ? await db.prepare(projectSql).all<ProjectRow>()
      : await db.prepare(projectSql).bind(user.id).all<ProjectRow>();

    let clients: unknown[] = [];
    let users: unknown[] = [];
    if (user.role === "admin") {
      clients = (await db.prepare(`
        SELECT c.id, c.name, c.code, c.status, COUNT(p.id) AS project_count
        FROM clients c LEFT JOIN projects p ON p.client_id = c.id
        GROUP BY c.id ORDER BY c.name
      `).all()).results;
      users = (await db.prepare(`
        SELECT u.id, u.email, u.display_name, u.role, u.status,
          COALESCE(group_concat(p.name, ' • '), '') AS project_names,
          COUNT(up.project_id) AS project_count
        FROM portal_users u
        LEFT JOIN user_projects up ON up.user_id = u.id
        LEFT JOIN projects p ON p.id = up.project_id
        GROUP BY u.id ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END, u.display_name
      `).all()).results;
    }

    return Response.json({
      user,
      clients,
      projects: projects.results,
      users,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
