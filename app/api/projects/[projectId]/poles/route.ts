import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string }> };
type AttachmentRow = { id: string; pole_id: string; name: string; height_m: number; photo_x: number | null; photo_y: number | null; side: string; color: string | null; kind: string; sort_order: number };
type AttachmentView = { id: string; name: string; heightM: number; photoX: number | null; photoY: number | null; side: string; color: string | null; kind: string; sortOrder: number };
type ProjectRow = { id: string; name: string; code: string; description: string | null; location_label: string | null; status: string; client_id: string; clients?: { name: string; code: string } | null };
type PoleRow = {
  id: string; project_id: string; pole_name: string; latitude: number; longitude: number; elevation_m: number;
  top_height_m: number | null; pole_height_ft: number | null; pole_class: string | null; status: string;
  image_filename: string | null; image_width: number | null; image_height: number | null; source_json_filename: string | null;
  model_version: string | null; tool_name: string | null; base_x: number | null; base_y: number | null; top_x: number | null; top_y: number | null;
};

export async function GET(request: Request, context: Context) {
  try {
    const { client } = await requirePortalUser(request);
    const { projectId } = await context.params;
    const projectResult = await client.from("projects").select("id,name,code,description,location_label,status,client_id,clients!inner(name,code)").eq("id", projectId).maybeSingle();
    if (projectResult.error) throw projectResult.error;
    if (!projectResult.data) return Response.json({ error: "Project not found or access is not assigned" }, { status: 404 });
    const polesResult = await client.from("poles").select("id,project_id,pole_name,latitude,longitude,elevation_m,top_height_m,pole_height_ft,pole_class,status,image_filename,image_width,image_height,source_json_filename,model_version,tool_name,base_x,base_y,top_x,top_y").eq("project_id", projectId).order("pole_name");
    if (polesResult.error) throw polesResult.error;
    const poleIds = (polesResult.data ?? []).map((pole) => pole.id);
    const attachmentsResult = poleIds.length ? await client.from("attachments").select("id,pole_id,name,height_m,photo_x,photo_y,side,color,kind,sort_order").in("pole_id", poleIds).order("sort_order") : { data: [], error: null };
    if (attachmentsResult.error) throw attachmentsResult.error;
    const byPole = new Map<string, AttachmentView[]>();
    for (const item of (attachmentsResult.data ?? []) as AttachmentRow[]) {
      const group = byPole.get(item.pole_id) ?? [];
      group.push({ id: item.id, name: item.name, heightM: item.height_m, photoX: item.photo_x, photoY: item.photo_y, side: item.side, color: item.color, kind: item.kind, sortOrder: item.sort_order });
      byPole.set(item.pole_id, group);
    }
    const p = projectResult.data as ProjectRow;
    return Response.json({
      project: { id: p.id, name: p.name, code: p.code, description: p.description, location_label: p.location_label, status: p.status, client_id: p.client_id, client_name: p.clients?.name ?? "", client_code: p.clients?.code ?? "" },
      poles: ((polesResult.data ?? []) as PoleRow[]).map((pole) => ({
        id: pole.id, projectId: pole.project_id, poleName: pole.pole_name, latitude: pole.latitude, longitude: pole.longitude,
        elevationM: pole.elevation_m, topHeightM: pole.top_height_m, poleHeightFt: pole.pole_height_ft, poleClass: pole.pole_class,
        status: pole.status, imageFilename: pole.image_filename, imageWidth: pole.image_width, imageHeight: pole.image_height,
        sourceJsonFilename: pole.source_json_filename, modelVersion: pole.model_version, toolName: pole.tool_name,
        baseX: pole.base_x, baseY: pole.base_y, topX: pole.top_x, topY: pole.top_y, attachments: byPole.get(pole.id) ?? [],
      })),
    });
  } catch (error) { return authErrorResponse(error); }
}

