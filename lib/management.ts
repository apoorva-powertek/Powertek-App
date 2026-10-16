export class FormValidationError extends Error {
  readonly field: string;
  constructor(message: string, field: string) { super(message); this.field = field; }
}
function object(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new FormValidationError("Enter the details before saving.", "name");
  return body as Record<string, unknown>;
}
function text(value: unknown, field: string, label: string, maximum: number) {
  if (typeof value !== "string" || !value.trim()) throw new FormValidationError(`Enter ${label}.`, field);
  if (value.trim().length > maximum) throw new FormValidationError(`Use ${maximum} characters or fewer for ${label}.`, field);
  return value.trim();
}
function identifier(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
function code(value: unknown, name: string) {
  if (value !== undefined && typeof value !== "string") throw new FormValidationError("Enter a valid code.", "code");
  const supplied = typeof value === "string" && value.trim();
  let result = (supplied ? value : name).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!supplied) result = result.slice(0, 32).replace(/-$/, "");
  if (!result || result.length > 32) throw new FormValidationError("Enter a code with 1–32 letters, numbers, or hyphens.", "code");
  return result;
}
function status(value: unknown) {
  if (value === undefined) return "active";
  if (value !== "active" && value !== "archived") throw new FormValidationError("Choose an active or archived status.", "status");
  return value;
}
export function parseClientInput(body: unknown) {
  const input = object(body); const name = text(input.name, "name", "a client name", 120);
  return { id: identifier(input.id), name, code: code(input.code, name), status: status(input.status) };
}
export function parseProjectInput(body: unknown) {
  const input = object(body); const name = text(input.name, "name", "a project name", 160);
  const clientId = identifier(input.clientId);
  if (!clientId) throw new FormValidationError("Choose a client, or add a new client below.", "clientId");
  const locationLabel = input.locationLabel === undefined ? "" : typeof input.locationLabel === "string" ? input.locationLabel.trim() : null;
  if (locationLabel === null || locationLabel.length > 160) throw new FormValidationError("Use 160 characters or fewer for the location.", "locationLabel");
  return { id: identifier(input.id), clientId, name, code: code(input.code, name), locationLabel, status: status(input.status) };
}
export function managementError(error: unknown, entity: "client" | "project" | "user") {
  if (error instanceof FormValidationError) return { status: 400, error: error.message, field: error.field };
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === "23505") return { status: 409, error: entity === "user" ? "That email already has a workspace account. Manage the existing person instead." : `That ${entity} code already exists${entity === "project" ? " for this client" : ""}. Enter a different code.`, field: entity === "user" ? "email" : "code" };
  if (value?.code === "P0002" || value?.code === "23503") return { status: 404, error: `The selected ${entity === "project" ? "client or project" : entity} no longer exists. Refresh and try again.` };
  if (value?.code === "42501") return { status: 403, error: /own account|own administrator|active administrator/i.test(value.message || "") ? "Keep your own administrator account enabled. Another administrator can manage your access." : `You do not have permission to change this ${entity}.` };
  if (value?.code === "22023") return { status: 400, error: "Check the details and status. New projects need an active client, and invitations need an active user." };
  return null;
}
