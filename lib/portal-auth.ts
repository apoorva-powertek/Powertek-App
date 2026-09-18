import { getChatGPTUser } from "@/app/chatgpt-auth";
import { rawDb } from "@/db/raw";
import type { PortalUser } from "@/lib/portal-types";

type UserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  display_name: string;
  role: "admin" | "client";
  status: "active" | "disabled";
};

export async function resolvePortalUser(): Promise<PortalUser | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;

  const db = rawDb();
  const now = new Date().toISOString();

  const row = await db.prepare(`
    SELECT id, auth_user_id, email, display_name, role, status
    FROM portal_users
    WHERE auth_user_id = ? OR lower(email) = lower(?)
    ORDER BY CASE WHEN auth_user_id = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).bind(identity.userId, identity.email, identity.userId).first<UserRow>();
  if (!row || row.status !== "active") return null;

  if (!row.auth_user_id) {
    await db.prepare(`
      UPDATE portal_users
      SET auth_user_id = ?, display_name = ?, updated_at = ?
      WHERE id = ? AND auth_user_id IS NULL
    `).bind(identity.userId, identity.displayName, now, row.id).run();
    row.auth_user_id = identity.userId;
    row.display_name = identity.displayName;
  }

  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
  };
}

export async function portalHasUsers(): Promise<boolean> {
  const row = await rawDb().prepare("SELECT COUNT(*) AS total FROM portal_users").first<{ total: number }>();
  return Number(row?.total ?? 0) > 0;
}

export async function requirePortalUser(): Promise<PortalUser> {
  const user = await resolvePortalUser();
  if (!user) throw new PortalAuthError("Access has not been assigned", 403);
  return user;
}

export async function requireAdmin(): Promise<PortalUser> {
  const user = await requirePortalUser();
  if (user.role !== "admin") throw new PortalAuthError("Administrator access required", 403);
  return user;
}

export async function requireProjectAccess(projectId: string): Promise<PortalUser> {
  const user = await requirePortalUser();
  if (user.role === "admin") return user;
  const allowed = await rawDb().prepare(`
    SELECT 1 AS allowed FROM user_projects WHERE user_id = ? AND project_id = ? LIMIT 1
  `).bind(user.id, projectId).first<{ allowed: number }>();
  if (!allowed) throw new PortalAuthError("This project is not assigned to your account", 403);
  return user;
}

export class PortalAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "PortalAuthError";
    this.status = status;
  }
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof PortalAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "The portal service is temporarily unavailable" }, { status: 503 });
}

export function normalizePoleName(value: string): string {
  return value.toUpperCase().replace(/\.[A-Z0-9]+$/i, "").replace(/[^A-Z0-9]+/g, "");
}

export function safeFilename(value: string): string {
  const cleaned = value.replace(/[\\/\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 180) || "file";
}
