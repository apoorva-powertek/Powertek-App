import { managementError } from "@/lib/management";
import { authErrorResponse } from "@/lib/supabase";
export function managementErrorResponse(error: unknown, entity: "client" | "project" | "user") {
  const result = managementError(error, entity);
  return result ? Response.json({ error: result.error, ...("field" in result ? { field: result.field } : {}) }, { status: result.status }) : authErrorResponse(error);
}
