import { requirePortalUser } from "@/lib/supabase";
import { parseProjectInput, FormValidationError } from "@/lib/management";
import { managementErrorResponse } from "@/lib/server/management-response";
export async function POST(request: Request) {
  try {
    const { client } = await requirePortalUser(request, true);
    const body = await request.json().catch(() => { throw new FormValidationError("Enter valid project details.", "name"); });
    const input = parseProjectInput(body);
    const result = await client.rpc("save_portal_project", { p_project_id: input.id, p_client_id: input.clientId, p_name: input.name, p_code: input.code, p_location_label: input.locationLabel, p_status: input.status });
    if (result.error) throw result.error;
    return Response.json({ ...input, id: result.data }, { status: input.id ? 200 : 201 });
  } catch (error) { return managementErrorResponse(error, "project"); }
}
