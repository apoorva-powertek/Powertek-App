import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalUser(request, true);
    const body = await request.json() as { name?: string; code?: string };
    const name = String(body.name ?? "").trim();
    const code = String(body.code ?? name).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
    if (!name || !code) return Response.json({ error: "Client name and code are required" }, { status: 400 });
    const result = await client.from("clients").insert({ id: crypto.randomUUID(), name, code, status: "active" }).select("id,name,code").single();
    if (result.error) throw result.error;
    return Response.json(result.data, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

