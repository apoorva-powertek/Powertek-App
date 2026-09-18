import { objectBucket, rawDb } from "@/db/raw";
import { authErrorResponse, requireProjectAccess, safeFilename } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string; poleId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { projectId, poleId } = await context.params;
    await requireProjectAccess(projectId);
    const row = await rawDb().prepare(`
      SELECT image_key, image_filename FROM poles WHERE id = ? AND project_id = ?
    `).bind(poleId, projectId).first<{ image_key: string | null; image_filename: string | null }>();
    if (!row?.image_key) return Response.json({ error: "Original pole image is not available" }, { status: 404 });
    const object = await objectBucket().get(row.image_key);
    if (!object) return Response.json({ error: "Original pole image is missing from storage" }, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=3600");
    headers.set("content-disposition", `inline; filename="${safeFilename(row.image_filename ?? "pole-photo.jpg")}"`);
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return authErrorResponse(error);
  }
}
