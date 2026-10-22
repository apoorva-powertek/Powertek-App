import { authErrorResponse, requireProjectEditor } from "@/lib/supabase";
import { qualityErrorResponse } from "@/lib/server/quality-response";
type Context = { params: Promise<{ projectId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { projectId } = await context.params;
    const { client } = await requireProjectEditor(request, projectId);
    let body: {poleId?:unknown;stage?:unknown;expectedUpdatedAt?:unknown;note?:unknown}|null;
    try { body = await request.json() as typeof body; } catch { return Response.json({ error: "Invalid review request" }, { status: 400 }); }
    if (!body || typeof body.poleId !== "string" || typeof body.stage !== "string" || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) || (body.note != null && typeof body.note !== "string")) return Response.json({ error: "Refresh the survey before reviewing it." }, { status: 400 });
    const pole = await client.from("poles").select("id").eq("id", body.poleId).eq("project_id", projectId).maybeSingle();
    if (pole.error) throw pole.error;
    if (!pole.data) return Response.json({ error: "Survey not found" }, { status: 404 });
    const result = await client.rpc("transition_survey_review", { p_pole_id: body.poleId, p_stage: body.stage, p_expected_updated_at: body.expectedUpdatedAt, p_note: body.note ?? "" });
    if (result.error) throw result.error;
    return Response.json({ saved: true });
  } catch (error) { return qualityErrorResponse(error) ?? authErrorResponse(error); }
}
