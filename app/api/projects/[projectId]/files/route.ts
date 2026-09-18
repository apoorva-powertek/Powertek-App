import { objectBucket, rawDb } from "@/db/raw";
import { authErrorResponse, normalizePoleName, requireAdmin, safeFilename } from "@/lib/portal-auth";

type Context = { params: Promise<{ projectId: string }> };

const ALLOWED_KINDS = new Set(["image", "json", "spreadsheet"]);

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin();
    const { projectId } = await context.params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "";
    const filename = safeFilename(url.searchParams.get("filename") ?? "file");
    const poleName = url.searchParams.get("poleName")?.trim() || null;
    if (!ALLOWED_KINDS.has(kind)) return Response.json({ error: "Unsupported file type" }, { status: 400 });
    if (!request.body) return Response.json({ error: "File body is empty" }, { status: 400 });
    const sizeHeader = Number(request.headers.get("content-length") ?? 0);
    if (sizeHeader > 120 * 1024 * 1024) return Response.json({ error: "Each file must be 120 MB or smaller" }, { status: 413 });
    const db = rawDb();
    const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    let pole: { id: string } | null = null;
    if (poleName) {
      pole = await db.prepare("SELECT id FROM poles WHERE project_id = ? AND normalized_name = ? LIMIT 1")
        .bind(projectId, normalizePoleName(poleName)).first<{ id: string }>();
    }
    const objectKey = `${projectId}/${kind}/${crypto.randomUUID()}-${filename}`;
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    await objectBucket().put(objectKey, request.body, {
      httpMetadata: { contentType },
      customMetadata: { projectId, poleId: pole?.id ?? "", originalFilename: filename },
    });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(`
      INSERT INTO project_files (id, project_id, pole_id, kind, object_key, filename, content_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, projectId, pole?.id ?? null, kind, objectKey, filename, contentType, sizeHeader, now).run();
    if (kind === "image" && pole) {
      await db.prepare(`
        UPDATE poles SET image_key = ?, image_filename = ?, status = 'complete', updated_at = ? WHERE id = ?
      `).bind(objectKey, filename, now, pole.id).run();
    }
    return Response.json({ id, filename, poleMatched: Boolean(pole) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
