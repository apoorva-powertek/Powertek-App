import { authErrorResponse, requireAdmin } from "@/lib/portal-auth";
import { rawDb } from "@/db/raw";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as { name?: string; code?: string };
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    if (!name || !code) return Response.json({ error: "Client name and code are required" }, { status: 400 });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await rawDb().prepare(`
      INSERT INTO clients (id, name, code, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?)
    `).bind(id, name, code, now, now).run();
    return Response.json({ id, name, code }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return Response.json({ error: "That client code already exists" }, { status: 409 });
    }
    return authErrorResponse(error);
  }
}
