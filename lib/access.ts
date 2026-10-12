import type { PortalRole, PortalUser } from "./portal-types";

export type ProjectAssignment = { projectId: string; canUpload: boolean };
export type AccessInput = { email: string; displayName: string; role: PortalRole; manageClients: boolean; assignments: ProjectAssignment[]; sendInvite: boolean };
export function parseAccessInput(body: unknown): AccessInput {
  if (!body || typeof body !== "object") throw new Error("Invitation details are required");
  const input = body as Record<string, unknown>;
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid work email");
  if (!["admin", "staff", "client"].includes(String(input.role))) throw new Error("Choose a valid role");
  const role = input.role as PortalRole;
  const displayName = String(input.displayName || email.split("@")[0]).trim().slice(0, 120);
  if (!displayName) throw new Error("Enter a display name");
  if (!Array.isArray(input.assignments) || input.assignments.length > 100) throw new Error("Choose up to 100 assigned projects");
  const assignments = input.assignments.map((assignment: unknown) => {
    if (!assignment || typeof assignment !== "object") throw new Error("Invalid project assignment");
    const item = assignment as Record<string, unknown>;
    if (typeof item.projectId !== "string" || !item.projectId.trim()) throw new Error("Invalid project assignment");
    return { projectId: item.projectId, canUpload: role === "staff" && item.canUpload === true };
  });
  if (new Set(assignments.map((item) => item.projectId)).size !== assignments.length) throw new Error("Duplicate project assignments");
  if (role === "client" && !assignments.length) throw new Error("Assign at least one project to a client");
  return { email, displayName, role, manageClients: role === "staff" && input.manageClients === true, assignments: role === "admin" ? [] : assignments, sendInvite: input.sendInvite === true };
}
export function canManageClients(user: PortalUser): boolean {
  return user.role === "admin" || (user.role === "staff" && user.permissions?.manageClients === true);
}
