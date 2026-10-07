import { authErrorResponse, requirePortalUser } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ projectId: string; poleId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { client } = await requirePortalUser(request);
    const { projectId, poleId } = await context.params;
    const result = await client.from("poles").select("image_key,image_filename").eq("id", poleId).eq("project_id", projectId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data?.image_key) return Response.json({ error: "Original pole photo has not been migrated to Supabase Storage" }, { status: 404 });
    const signed = await client.storage.from("project-files").createSignedUrl(result.data.image_key, 90);
    if (signed.error || !signed.data?.signedUrl) return Response.json({ error: "Original pole photo is unavailable in secure storage" }, { status: 404 });
    return Response.redirect(signed.data.signedUrl, 302);
  } catch (error) { return authErrorResponse(error); }
}

