import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { rawDb } from "@/db/raw";
import { authErrorResponse } from "@/lib/portal-auth";
import { seedCurrentSurvey } from "@/lib/seed-current-survey";

function secureEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left), b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let difference = 0; for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function POST(request: Request) {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return Response.json({ error: "Sign in before activating the portal" }, { status: 401 });
    const body = await request.json() as { code?: string };
    const expected = env.PORTAL_SETUP_CODE;
    if (!expected || !secureEqual(String(body.code ?? "").trim(), expected)) return Response.json({ error: "Setup code is incorrect" }, { status: 403 });
    const db = rawDb(); const now = new Date().toISOString(); const id = crypto.randomUUID();
    const result = await db.prepare(`
      INSERT INTO portal_users (id, auth_user_id, email, display_name, role, status, created_at, updated_at)
      SELECT ?, ?, lower(?), ?, 'admin', 'active', ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM portal_users)
    `).bind(id, identity.userId, identity.email, identity.displayName, now, now).run();
    if (!result.meta.changes) return Response.json({ error: "An administrator has already activated this portal" }, { status: 409 });
    let survey = null;
    try { survey = await seedCurrentSurvey(db); } catch (seedError) { console.error("Initial survey seed failed", seedError); }
    return Response.json({ activated: true, survey });
  } catch (error) { return authErrorResponse(error); }
}
