import currentSurvey from "@/lib/current-survey.json";
import { normalizePoleName } from "@/lib/portal-auth";

function kindFor(name: string) {
  const value = name.toUpperCase();
  if (/TRANSFORMER|CUTOUT|FUSE|SWITCH|LIGHT|METER|CABINET|ANTENNA|RISER|EQUIPMENT/.test(value)) return "equipment";
  if (/INSULATOR|PIN|SPOOL|DEAD.?END/.test(value)) return "insulator";
  if (/GUY|ANCHOR/.test(value)) return "guy";
  if (/PRIMARY|NEUTRAL|COMM|WIRE|TEL|CATV|FIBER|SECONDARY/.test(value)) return "wire";
  return "attachment";
}

async function batches(db: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += 60) await db.batch(statements.slice(index, index + 60));
}

export async function seedCurrentSurvey(db: D1Database) {
  const exists = await db.prepare("SELECT id FROM projects WHERE code = ? LIMIT 1").bind("POLE-SURVEY-2026").first<{ id: string }>();
  if (exists) return { projectId: exists.id, seeded: false };
  const now = new Date().toISOString(); const clientId = crypto.randomUUID(); const projectId = crypto.randomUUID();
  await db.batch([
    db.prepare(`INSERT INTO clients (id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)`)
      .bind(clientId, "Powertek Survey", "POWERTEK", now, now),
    db.prepare(`INSERT INTO projects (id, client_id, name, code, description, location_label, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
      .bind(projectId, clientId, "Pole Locations & Elevation", "POLE-SURVEY-2026", "Current measured pole survey imported from the supplied location and attachment datasets.", "Fort Nelson, British Columbia", now, now),
  ]);
  const poleStatements: D1PreparedStatement[] = []; const attachmentStatements: D1PreparedStatement[] = [];
  for (const pole of currentSurvey.poles) {
    const poleId = crypto.randomUUID();
    poleStatements.push(db.prepare(`
      INSERT INTO poles (id, project_id, pole_name, normalized_name, latitude, longitude, elevation_m, top_height_m, pole_height_ft, pole_class, status, image_filename, image_width, image_height, source_json_filename, model_version, tool_name, base_x, base_y, top_x, top_y, raw_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).bind(poleId, projectId, pole.poleName, normalizePoleName(pole.poleName), pole.latitude, pole.longitude, pole.elevationM, pole.topHeightM, pole.poleHeightFt, pole.poleClass, pole.attachments.length ? "complete" : "location_only", pole.imageWidth, pole.imageHeight, pole.sourceJsonFilename, pole.modelVersion, pole.toolName, pole.baseX, pole.baseY, pole.topX, pole.topY, now, now));
    pole.attachments.forEach((item, index) => attachmentStatements.push(db.prepare(`
      INSERT INTO attachments (id, pole_id, name, height_m, photo_x, photo_y, side, color, kind, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), poleId, item.name, item.heightM, item.photoX, item.photoY, item.side, item.color, kindFor(item.name), index)));
  }
  await batches(db, poleStatements); await batches(db, attachmentStatements);
  return { projectId, seeded: true, poles: currentSurvey.poles.length, attachments: attachmentStatements.length };
}
