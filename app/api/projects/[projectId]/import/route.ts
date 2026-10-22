import { authErrorResponse, requireProjectEditor } from "@/lib/supabase";
import { maxSourceFileBytes, validateSurveyPoles, type ImportFileManifest } from "@/lib/survey-quality";
import { qualityErrorResponse } from "@/lib/server/quality-response";
type Context = { params: Promise<{ projectId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { projectId } = await context.params;
    const { client } = await requireProjectEditor(request, projectId);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 3500000) return Response.json({ error: "The record package is too large. Use a smaller spreadsheet batch." }, { status: 413 });
    let body;
    try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid import request" }, { status: 400 }); }
    if (!body || typeof body !== "object" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id ?? "")) return Response.json({ error: "Invalid import identifier" }, { status: 400 });
    if (body.action === "commit") {
      const batch = await client.from("survey_imports").select("project_id").eq("id", body.id).maybeSingle();
      if (batch.error) throw batch.error;
      if (batch.data?.project_id !== projectId) return Response.json({ error: "Import not found" }, { status: 404 });
      const result = await client.rpc("commit_survey_import", { p_id: body.id });
      if (result.error) throw result.error;
      return Response.json(result.data);
    }
    if (body.action !== "prepare") return Response.json({ error: "Validate your package before importing." }, { status: 400 });
    const validated = validateSurveyPoles(body.poles);
    if (validated.errors.length) return Response.json({ error: validated.errors.slice(0, 10).join(" ") }, { status: 400 });
    const files = body.files as ImportFileManifest[];
    if (!Array.isArray(files) || !files.length || files.length > 10000 || files.some((f) => !f || typeof f.name !== "string" || typeof f.objectKey !== "string" || !f.objectKey.startsWith(`${projectId}/imports/${body.id}/`) || !Number.isSafeInteger(f.size) || f.size <= 0 || f.size > maxSourceFileBytes)) return Response.json({ error: "Invalid source file manifest" }, { status: 400 });
    const result = await client.rpc("prepare_survey_import", { p_id: body.id, p_project_id: projectId, p_source_name: String(body.sourceName ?? "").slice(0, 180), p_poles: validated.poles, p_files: files });
    if (result.error) throw result.error;
    return Response.json(result.data);
  } catch (error) { return qualityErrorResponse(error) ?? authErrorResponse(error); }
}
