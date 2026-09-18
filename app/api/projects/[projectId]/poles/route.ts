import { rawDb } from "@/db/raw";
import { authErrorResponse, requireProjectAccess } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { projectId } = await context.params;
    await requireProjectAccess(projectId);
    const db = rawDb();
    const project = await db.prepare(`
      SELECT p.id, p.name, p.code, p.description, p.location_label, p.status,
        c.id AS client_id, c.name AS client_name, c.code AS client_code
      FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = ?
    `).bind(projectId).first();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    const poleResult = await db.prepare(`
      SELECT id, project_id, pole_name, latitude, longitude, elevation_m, top_height_m,
        pole_height_ft, pole_class, status, image_filename, image_width, image_height,
        source_json_filename, model_version, tool_name, base_x, base_y, top_x, top_y
      FROM poles WHERE project_id = ? ORDER BY pole_name
    `).bind(projectId).all<Record<string, unknown>>();
    const poles = poleResult.results;
    if (!poles.length) return Response.json({ project, poles: [] });
    const attachmentResult = await db.prepare(`
      SELECT a.id, a.pole_id, a.name, a.height_m, a.photo_x, a.photo_y, a.side, a.color, a.kind, a.sort_order
      FROM attachments a JOIN poles p ON p.id = a.pole_id
      WHERE p.project_id = ? ORDER BY a.pole_id, a.height_m DESC, a.sort_order
    `).bind(projectId).all<Record<string, unknown>>();
    const attachmentsByPole = new Map<string, unknown[]>();
    for (const attachment of attachmentResult.results) {
      const poleId = String(attachment.pole_id);
      const list = attachmentsByPole.get(poleId) ?? [];
      list.push({
        id: attachment.id,
        name: attachment.name,
        heightM: attachment.height_m,
        photoX: attachment.photo_x,
        photoY: attachment.photo_y,
        side: attachment.side,
        color: attachment.color,
        kind: attachment.kind,
        sortOrder: attachment.sort_order,
      });
      attachmentsByPole.set(poleId, list);
    }
    return Response.json({
      project,
      poles: poles.map((pole) => ({
        id: pole.id,
        projectId: pole.project_id,
        poleName: pole.pole_name,
        latitude: pole.latitude,
        longitude: pole.longitude,
        elevationM: pole.elevation_m,
        topHeightM: pole.top_height_m,
        poleHeightFt: pole.pole_height_ft,
        poleClass: pole.pole_class,
        status: pole.status,
        imageFilename: pole.image_filename,
        imageWidth: pole.image_width,
        imageHeight: pole.image_height,
        sourceJsonFilename: pole.source_json_filename,
        modelVersion: pole.model_version,
        toolName: pole.tool_name,
        baseX: pole.base_x,
        baseY: pole.base_y,
        topX: pole.top_x,
        topY: pole.top_y,
        attachments: attachmentsByPole.get(String(pole.id)) ?? [],
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
