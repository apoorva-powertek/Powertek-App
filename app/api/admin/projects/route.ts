import { authErrorResponse, requireAdmin } from "@/lib/portal-auth";
import { rawDb } from "@/db/raw";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json() as { clientId?: string; name?: string; code?: string; locationLabel?: string; description?: string };
    const clientId = String(body.clientId ?? "");
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    if (!clientId || !name || !code) return Response.json({ error: "Client, project name, and code are required" }, { status: 400 });
    const client = await rawDb().prepare("SELECT id FROM clients WHERE id = ? AND status = 'active'").bind(clientId).first();
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await rawDb().prepare(`
      INSERT INTO projects (id, client_id, name, code, description, location_label, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(id, clientId, name, code, String(body.description ?? "").trim(), String(body.locationLabel ?? "").trim(), now, now).run();
    return Response.json({ id, clientId, name, code }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return Response.json({ error: "That project code already exists for this client" }, { status: 409 });
    }
    return authErrorResponse(error);
  }
}
