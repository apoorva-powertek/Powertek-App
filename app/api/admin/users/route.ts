import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalUser(request, true);
    const body = await request.json() as { email?: string; displayName?: string; role?: "admin" | "client"; projectIds?: string[] };
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? email.split("@")[0] ?? "Client user").trim();
    const role = body.role === "admin" ? "admin" : "client";
    const projectIds = Array.isArray(body.projectIds) ? [...new Set(body.projectIds.map(String))] : [];
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "A valid client email is required" }, { status: 400 });
    if (role === "client" && !projectIds.length) return Response.json({ error: "Assign at least one project" }, { status: 400 });
    const existing = await client.from("portal_users").select("id").ilike("email", email).maybeSingle();
    if (existing.error) throw existing.error;
    const id = existing.data?.id ?? crypto.randomUUID();
    const profile = await client.from("portal_users").upsert({ id, email, display_name: displayName, role, status: "active" }, { onConflict: "id" });
    if (profile.error) throw profile.error;
    const removed = await client.from("user_projects").delete().eq("user_id", id);
    if (removed.error) throw removed.error;
    if (role === "client" && projectIds.length) {
      const assignments = await client.from("user_projects").insert(projectIds.map((project_id) => ({ user_id: id, project_id })));
      if (assignments.error) throw assignments.error;
    }
    return Response.json({ id, email, displayName, role, projectIds }, { status: existing.data ? 200 : 201 });
  } catch (error) { return authErrorResponse(error); }
}

