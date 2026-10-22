import { authErrorResponse, requirePortalUser, requireProjectEditor } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const url = new URL(request.url), projectId = url.searchParams.get("projectId");
    const { client } = projectId ? await requireProjectEditor(request, projectId) : await requirePortalUser(request, true);
    let query = client.from("audit_events").select("id,occurred_at,actor_name,project_id,entity_type,entity_id,action,details").order("id", { ascending: false }).limit(31);
    if (projectId) query = query.eq("project_id", projectId);
    const before = url.searchParams.get("before");
    if (before && /^\d+$/.test(before)) query = query.lt("id", before);
    const result = await query;
    if (result.error) throw result.error;
    const rows = result.data ?? [];
    return Response.json({ events: rows.slice(0, 30), next: rows.length > 30 ? String(rows[29].id) : null });
  } catch (error) { return authErrorResponse(error); }
}
