import { requireClientManager } from "@/lib/supabase";
import { parseClientInput, FormValidationError } from "@/lib/management";
import { managementErrorResponse } from "@/lib/server/management-response";
export async function POST(request: Request) {
  try {
    const { client } = await requireClientManager(request);
    const body = await request.json().catch(() => { throw new FormValidationError("Enter valid client details.", "name"); });
    const input = parseClientInput(body);
    const result = await client.rpc("save_portal_client", { p_client_id: input.id, p_name: input.name, p_code: input.code, p_status: input.status });
    if (result.error) throw result.error;
    return Response.json({ ...input, id: result.data }, { status: input.id ? 200 : 201 });
  } catch (error) { return managementErrorResponse(error, "client"); }
}
