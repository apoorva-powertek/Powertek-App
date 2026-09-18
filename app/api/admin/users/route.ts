import { authErrorResponse, requireAdmin } from "@/lib/portal-auth";
import { rawDb } from "@/db/raw";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as { email?: string; displayName?: string; role?: "admin" | "client"; projectIds?: string[] };
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? email.split("@")[0] ?? "Client user").trim();
    const role = body.role === "admin" ? "admin" : "client";
    const projectIds = Array.isArray(body.projectIds) ? [...new Set(body.projectIds.map(String))] : [];
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "A valid client email is required" }, { status: 400 });
    if (role === "client" && projectIds.length === 0) return Response.json({ error: "Assign at least one project" }, { status: 400 });

    const db = rawDb();
    const now = new Date().toISOString();
    const existing = await db.prepare("SELECT id FROM portal_users WHERE lower(email) = lower(?)").bind(email).first<{ id: string }>();
    const userId = existing?.id ?? crypto.randomUUID();
    if (existing) {
      await db.prepare(`UPDATE portal_users SET display_name = ?, role = ?, status = 'active', updated_at = ? WHERE id = ?`)
        .bind(displayName, role, now, userId).run();
      await db.prepare("DELETE FROM user_projects WHERE user_id = ?").bind(userId).run();
    } else {
      await db.prepare(`
        INSERT INTO portal_users (id, auth_user_id, email, display_name, role, status, created_at, updated_at)
        VALUES (?, NULL, ?, ?, ?, 'active', ?, ?)
      `).bind(userId, email, displayName, role, now, now).run();
    }

    const statements = projectIds.map((projectId) => db.prepare(`
      INSERT OR IGNORE INTO user_projects (user_id, project_id, assigned_at) VALUES (?, ?, ?)
    `).bind(userId, projectId, now));
    if (statements.length) await db.batch(statements);
    return Response.json({ id: userId, email, displayName, role, projectIds }, { status: existing ? 200 : 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
