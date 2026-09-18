import { rawDb } from "@/db/raw";
import { authErrorResponse, normalizePoleName, requireAdmin } from "@/lib/portal-auth";
import type { ImportPole } from "@/lib/portal-types";

type Context = { params: Promise<{ projectId: string }> };

function finiteOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyAttachment(name: string): string {
  const value = name.toUpperCase();
  if (/TRANSFORMER|CUTOUT|FUSE|SWITCH|LIGHT|METER|CABINET|ANTENNA|RISER|EQUIPMENT/.test(value)) return "equipment";
  if (/INSULATOR|PIN|SPOOL|DEAD.?END/.test(value)) return "insulator";
  if (/GUY|ANCHOR/.test(value)) return "guy";
  if (/PRIMARY|NEUTRAL|COMM|WIRE|TEL|CATV|FIBER|SECONDARY/.test(value)) return "wire";
  return "attachment";
}

async function runInChunks(db: D1Database, statements: D1PreparedStatement[], size = 60) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { projectId } = await context.params;
    const body = await request.json() as { poles?: ImportPole[]; sourceName?: string };
    if (!Array.isArray(body.poles) || body.poles.length === 0) {
      return Response.json({ error: "No valid pole records were found in the upload" }, { status: 400 });
    }
    if (body.poles.length > 5000) return Response.json({ error: "A single import is limited to 5,000 poles" }, { status: 413 });
    const db = rawDb();
    const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    const currentRows = await db.prepare("SELECT id, pole_name FROM poles WHERE project_id = ?").bind(projectId).all<{ id: string; pole_name: string }>();
    const existing = new Map(currentRows.results.map((row) => [row.pole_name, row.id]));
    const now = new Date().toISOString();
    const poleStatements: D1PreparedStatement[] = [];
    const attachmentDeletes: D1PreparedStatement[] = [];
    const attachmentStatements: D1PreparedStatement[] = [];
    let attachmentCount = 0;

    for (const source of body.poles) {
      const poleName = String(source.poleName ?? "").trim();
      const latitude = finiteOrNull(source.latitude);
      const longitude = finiteOrNull(source.longitude);
      const elevationM = finiteOrNull(source.elevationM);
      if (!poleName || latitude === null || longitude === null || elevationM === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;
      const poleId = existing.get(poleName) ?? crypto.randomUUID();
      existing.set(poleName, poleId);
      const normalized = normalizePoleName(poleName);
      const sourceAttachments = Array.isArray(source.attachments) ? source.attachments.filter((item) => item && finiteOrNull(item.heightM) !== null) : [];
      const complete = Boolean(source.imageFilename || sourceAttachments.length);
      const rawJson = source.rawJson === undefined ? null : JSON.stringify(source.rawJson).slice(0, 750000);
      poleStatements.push(db.prepare(`
        INSERT INTO poles (
          id, project_id, pole_name, normalized_name, latitude, longitude, elevation_m, top_height_m,
          pole_height_ft, pole_class, status, image_filename, image_width, image_height,
          source_json_filename, model_version, tool_name, base_x, base_y, top_x, top_y, raw_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, pole_name) DO UPDATE SET
          normalized_name = excluded.normalized_name,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          elevation_m = excluded.elevation_m,
          top_height_m = COALESCE(excluded.top_height_m, poles.top_height_m),
          pole_height_ft = COALESCE(excluded.pole_height_ft, poles.pole_height_ft),
          pole_class = COALESCE(excluded.pole_class, poles.pole_class),
          status = CASE WHEN poles.image_key IS NOT NULL OR excluded.status = 'complete' THEN 'complete' ELSE 'location_only' END,
          image_filename = COALESCE(excluded.image_filename, poles.image_filename),
          image_width = COALESCE(excluded.image_width, poles.image_width),
          image_height = COALESCE(excluded.image_height, poles.image_height),
          source_json_filename = COALESCE(excluded.source_json_filename, poles.source_json_filename),
          model_version = COALESCE(excluded.model_version, poles.model_version),
          tool_name = COALESCE(excluded.tool_name, poles.tool_name),
          base_x = COALESCE(excluded.base_x, poles.base_x),
          base_y = COALESCE(excluded.base_y, poles.base_y),
          top_x = COALESCE(excluded.top_x, poles.top_x),
          top_y = COALESCE(excluded.top_y, poles.top_y),
          raw_json = COALESCE(excluded.raw_json, poles.raw_json),
          updated_at = excluded.updated_at
      `).bind(
        poleId, projectId, poleName, normalized, latitude, longitude, elevationM,
        finiteOrNull(source.topHeightM), finiteOrNull(source.poleHeightFt), source.poleClass == null ? null : String(source.poleClass),
        complete ? "complete" : "location_only", source.imageFilename ?? null, finiteOrNull(source.imageWidth), finiteOrNull(source.imageHeight),
        source.sourceJsonFilename ?? null, source.modelVersion ?? null, source.toolName ?? null,
        finiteOrNull(source.baseX), finiteOrNull(source.baseY), finiteOrNull(source.topX), finiteOrNull(source.topY), rawJson, now, now,
      ));
      if (sourceAttachments.length) {
        attachmentDeletes.push(db.prepare("DELETE FROM attachments WHERE pole_id = ?").bind(poleId));
        sourceAttachments.forEach((attachment, index) => {
          const name = String(attachment.name ?? `Attachment ${index + 1}`).trim();
          attachmentStatements.push(db.prepare(`
            INSERT INTO attachments (id, pole_id, name, height_m, photo_x, photo_y, side, color, kind, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(), poleId, name, finiteOrNull(attachment.heightM), finiteOrNull(attachment.photoX), finiteOrNull(attachment.photoY),
            attachment.side === "left" ? "left" : "right", attachment.color ?? null, attachment.kind ?? classifyAttachment(name), index,
          ));
          attachmentCount += 1;
        });
      }
    }
    if (!poleStatements.length) return Response.json({ error: "Pole coordinates were missing or invalid" }, { status: 400 });
    await runInChunks(db, poleStatements);
    await runInChunks(db, attachmentDeletes);
    await runInChunks(db, attachmentStatements);
    await db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").bind(now, projectId).run();
    return Response.json({ importedPoles: poleStatements.length, importedAttachments: attachmentCount, sourceName: body.sourceName ?? null });
  } catch (error) {
    return authErrorResponse(error);
  }
}
