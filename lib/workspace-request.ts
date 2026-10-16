import { authenticatedFetch } from "@/lib/supabase";
export class WorkspaceRequestError extends Error {
  field?: string;
  accessSaved?: boolean;
  constructor(message: string, field?: string, accessSaved?: boolean) { super(message); this.field = field; this.accessSaved = accessSaved; }
}
export async function workspaceRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers); headers.set("content-type", "application/json");
  const response = await authenticatedFetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({})) as { error?: string; field?: string; accessSaved?: boolean };
  if (!response.ok) throw new WorkspaceRequestError(data.error || `Request failed (${response.status})`, data.field, data.accessSaved);
  return data as T;
}
