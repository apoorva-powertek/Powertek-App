import type { AttachmentRecord } from "@/lib/portal-types";
import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { client, user } = await requirePortalUser(request);
    const { projectId } = await context.params;
    const projectResult = await client.from("projects").select("id,name,code,description,location_label,status,client_id,clients!inner(name,code)").eq("id", projectId).maybeSingle();
    if (projectResult.error) throw projectResult.error;
    if (!projectResult.data) return Response.json({ error: "Project not found or access is not assigned" }, { status: 404 });
    const polesResult = await client.from("poles").select("id,project_id,pole_name,latitude,longitude,elevation_m,top_height_m,pole_height_ft,pole_class,status,review_stage,updated_at,image_filename,image_width,image_height,source_json_filename,model_version,tool_name,base_x,base_y,top_x,top_y").eq("project_id", projectId).order("pole_name");
    if (polesResult.error) throw polesResult.error;
    const poleIds = (polesResult.data ?? []).map((pole) => pole.id);
    const attachmentsResult = poleIds.length ? await client.from("attachments").select("id,pole_id,name,height_m,photo_x,photo_y,side,color,kind,sort_order").in("pole_id", poleIds).order("sort_order") : { data: [], error: null };
    if (attachmentsResult.error) throw attachmentsResult.error;
    const byPole = new Map<string, AttachmentRecord[]>();
    for (const item of attachmentsResult.data ?? []) {
      const group = byPole.get(item.pole_id) ?? [];
      group.push({ id: item.id, name: item.name, heightM: item.height_m, photoX: item.photo_x, photoY: item.photo_y, side: item.side, color: item.color, kind: item.kind, sortOrder: item.sort_order });
      byPole.set(item.pole_id, group);
    }
    const p = projectResult.data as unknown as { id: string; name: string; code: string; description: string; location_label: string; status: string; client_id: string; clients: { name: string; code: string } };
    const assignment = user.role === "staff" ? await client.from("user_projects").select("can_upload").eq("user_id", user.id).eq("project_id", projectId).maybeSingle() : null;
    if (assignment?.error) throw assignment.error;
    return Response.json({
      canEdit: user.role === "admin" || (user.role === "staff" && assignment?.data?.can_upload === true),
      project: { id: p.id, name: p.name, code: p.code, description: p.description, location_label: p.location_label, status: p.status, client_id: p.client_id, client_name: p.clients?.name ?? "", client_code: p.clients?.code ?? "" },
      poles: (polesResult.data ?? []).map((pole) => ({
        id: pole.id, projectId: pole.project_id, poleName: pole.pole_name, latitude: pole.latitude, longitude: pole.longitude,
        elevationM: pole.elevation_m, topHeightM: pole.top_height_m, poleHeightFt: pole.pole_height_ft, poleClass: pole.pole_class,
        status: pole.status, reviewStage: pole.review_stage, updatedAt: pole.updated_at, imageFilename: pole.image_filename, imageWidth: pole.image_width, imageHeight: pole.image_height,
        sourceJsonFilename: pole.source_json_filename, modelVersion: pole.model_version, toolName: pole.tool_name,
        baseX: pole.base_x, baseY: pole.base_y, topX: pole.top_x, topY: pole.top_y, attachments: byPole.get(pole.id) ?? [],
      })),
    });
  } catch (error) { return authErrorResponse(error); }
}

