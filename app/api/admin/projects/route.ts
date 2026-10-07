import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalUser(request, true);
    const body = await request.json() as { clientId?: string; name?: string; code?: string; locationLabel?: string; description?: string };
    const clientId = String(body.clientId ?? "");
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    if (!clientId || !name || !code) return Response.json({ error: "Client, project name, and code are required" }, { status: 400 });
    const result = await client.from("projects").insert({ id: crypto.randomUUID(), client_id: clientId, name, code, description: body.description ?? "", location_label: body.locationLabel ?? "", status: "active" }).select("id,client_id,name,code").single();
    if (result.error) throw result.error;
    return Response.json(result.data, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

