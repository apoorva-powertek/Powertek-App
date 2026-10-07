import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

type Context = { params: Promise<{ projectId: string }> };
const safeFilename = (value: string) => value.replace(/[\\/\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 180) || "file";
const normalize = (value: string) => value.toUpperCase().replace(/\.[A-Z0-9]+$/i, "").replace(/[^A-Z0-9]+/g, "");

export async function PUT(request: Request, context: Context) {
  try {
    const { client } = await requirePortalUser(request, true);
    const { projectId } = await context.params;
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "";
    const filename = safeFilename(url.searchParams.get("filename") ?? "file");
    const poleName = url.searchParams.get("poleName") ?? "";
    const sizeHeader = Number(request.headers.get("content-length") ?? 0);
    if (!["image", "json", "spreadsheet"].includes(kind)) return Response.json({ error: "Unsupported file type" }, { status: 400 });
    if (sizeHeader > 524288000) return Response.json({ error: "Files must be smaller than 500 MB" }, { status: 413 });
    const project = await client.from("projects").select("id").eq("id", projectId).maybeSingle();
    if (project.error) throw project.error;
    if (!project.data) return Response.json({ error: "Project not found" }, { status: 404 });
    let pole: { id: string } | null = null;
    if (poleName) {
      const match = await client.from("poles").select("id").eq("project_id", projectId).eq("normalized_name", normalize(poleName)).limit(1).maybeSingle();
      if (match.error) throw match.error;
      pole = match.data;
    }
    const objectKey = `${projectId}/${kind}/${crypto.randomUUID()}-${filename}`;
    const bytes = await request.arrayBuffer();
    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const upload = await client.storage.from("project-files").upload(objectKey, bytes, { contentType, upsert: false });
    if (upload.error) throw upload.error;
    const id = crypto.randomUUID();
    const fileRow = await client.from("project_files").insert({ id, project_id: projectId, pole_id: pole?.id ?? null, kind, object_key: objectKey, filename, content_type: contentType, size_bytes: bytes.byteLength }).select("id").single();
    if (fileRow.error) throw fileRow.error;
    if (kind === "image" && pole) {
      const image = await client.from("poles").update({ image_key: objectKey, image_filename: filename, status: "complete", updated_at: new Date().toISOString() }).eq("id", pole.id).eq("project_id", projectId);
      if (image.error) throw image.error;
    }
    return Response.json({ id, filename, poleMatched: Boolean(pole) }, { status: 201 });
  } catch (error) { return authErrorResponse(error); }
}

