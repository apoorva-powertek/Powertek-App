import { authErrorResponse, requirePortalUser } from "@/lib/supabase";
import type { ImportPole } from "@/lib/portal-types";

type Context = { params: Promise<{ projectId: string }> };
const finiteOrNull = (value: unknown): number | null => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; };
const normalize = (value: string) => value.toUpperCase().replace(/\.[A-Z0-9]+$/i, "").replace(/[^A-Z0-9]+/g, "");
function kind(name: string) { const value = name.toUpperCase(); if (/TRANSFORMER|CUTOUT|FUSE|SWITCH|LIGHT|METER|CABINET|ANTENNA|RISER|EQUIPMENT/.test(value)) return "equipment"; if (/INSULATOR|PIN|SPOOL|DEAD.?END/.test(value)) return "insulator"; if (/GUY|ANCHOR/.test(value)) return "guy"; if (/PRIMARY|NEUTRAL|COMM|WIRE|TEL|CATV|FIBER|SECONDARY/.test(value)) return "wire"; return "attachment"; }

export async function POST(request: Request, context: Context) {
  try {
    const { client } = await requirePortalUser(request, true);
    const { projectId } = await context.params;
    const body = await request.json() as { poles?: ImportPole[]; sourceName?: string };
    if (!Array.isArray(body.poles) || !body.poles.length) return Response.json({ error: "No valid pole records were found in the upload" }, { status: 400 });
    if (body.poles.length > 5000) return Response.json({ error: "A single import is limited to 5,000 poles" }, { status: 413 });
    const project = await client.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (project.error) throw project.error;
    if (!project.data) return Response.json({ error: "Project not found" }, { status: 404 });
    const rows = body.poles.flatMap((pole) => {
      const poleName = String(pole.poleName ?? "").trim();
      const latitude = finiteOrNull(pole.latitude), longitude = finiteOrNull(pole.longitude), elevation = finiteOrNull(pole.elevationM);
      if (!poleName || latitude === null || longitude === null || elevation === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
      const attachments = (pole.attachments ?? []).filter((item) => item && finiteOrNull(item.heightM) !== null);
      return [{ pole, poleName, latitude, longitude, elevation, attachments }];
    });
    if (!rows.length) return Response.json({ error: "Pole coordinates were missing or invalid" }, { status: 400 });
    const timestamp = new Date().toISOString();
    const records = rows.map(({ pole, poleName, latitude, longitude, elevation, attachments }) => ({
      id: crypto.randomUUID(), project_id: projectId, pole_name: poleName, normalized_name: normalize(poleName), latitude, longitude, elevation_m: elevation,
      top_height_m: finiteOrNull(pole.topHeightM), pole_height_ft: finiteOrNull(pole.poleHeightFt), pole_class: pole.poleClass == null ? null : String(pole.poleClass),
      status: pole.imageFilename || attachments.length ? "complete" : "location_only", image_filename: pole.imageFilename ?? null,
      image_width: finiteOrNull(pole.imageWidth), image_height: finiteOrNull(pole.imageHeight), source_json_filename: pole.sourceJsonFilename ?? null,
      model_version: pole.modelVersion ?? null, tool_name: pole.toolName ?? null, base_x: finiteOrNull(pole.baseX), base_y: finiteOrNull(pole.baseY),
      top_x: finiteOrNull(pole.topX), top_y: finiteOrNull(pole.topY), raw_json: pole.rawJson === undefined ? null : JSON.stringify(pole.rawJson).slice(0, 750000), updated_at: timestamp,
    }));
    for (let i = 0; i < records.length; i += 100) {
      const upsert = await client.from("poles").upsert(records.slice(i, i + 100), { onConflict: "project_id,pole_name" }).select("id,pole_name");
      if (upsert.error) throw upsert.error;
    }
    const saved = await client.from("poles").select("id,pole_name").eq("project_id", projectId);
    if (saved.error) throw saved.error;
    const idByName = new Map((saved.data ?? []).map((row) => [row.pole_name, row.id]));
    const poleIds = rows.map((row) => idByName.get(row.poleName)).filter(Boolean) as string[];
    const removed = await client.from("attachments").delete().in("pole_id", poleIds);
    if (removed.error) throw removed.error;
    const attachments = rows.flatMap(({ poleName, attachments: items }) => items.map((item, index) => ({
      id: crypto.randomUUID(), pole_id: idByName.get(poleName), name: String(item.name ?? `Attachment ${index + 1}`).trim(), height_m: finiteOrNull(item.heightM),
      photo_x: finiteOrNull(item.photoX), photo_y: finiteOrNull(item.photoY), side: item.side === "left" ? "left" : "right", color: item.color ?? null, kind: item.kind ?? kind(item.name ?? ""), sort_order: index,
    })));
    for (let i = 0; i < attachments.length; i += 250) {
      const inserted = await client.from("attachments").insert(attachments.slice(i, i + 250));
      if (inserted.error) throw inserted.error;
    }
    await client.from("projects").update({ updated_at: timestamp }).eq("id", projectId);
    return Response.json({ importedPoles: rows.length, importedAttachments: attachments.length, sourceName: body.sourceName ?? null });
  } catch (error) { return authErrorResponse(error); }
}

