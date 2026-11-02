import { defaultFilters, type ProjectFilters } from "./dashboard";

export const workspaceTabs = ["overview", "projects", "clients", "users", "import", "activity"] as const;
export type WorkspaceTab = typeof workspaceTabs[number];
export type WorkspaceLocation = { tab: WorkspaceTab; filters: ProjectFilters; view: "grid" | "list" };
const filterParams: Record<keyof ProjectFilters, string> = { query: "q", clientId: "client", status: "status", progress: "progress", updatedAfter: "from", updatedBefore: "through", sort: "sort" };

export function readWorkspaceLocation(href: string): WorkspaceLocation {
  const params = new URL(href, "https://workspace.invalid").searchParams;
  const requested = params.get("tab") as WorkspaceTab;
  const filters = { ...defaultFilters };
  for (const key of Object.keys(filterParams) as (keyof ProjectFilters)[]) {
    const value = params.get(filterParams[key]);
    if (value) filters[key] = value;
  }
  if (!["all", "not_started", "in_progress", "complete"].includes(filters.progress)) filters.progress = "all";
  if (!["recent", "name", "progress"].includes(filters.sort)) filters.sort = "recent";
  for (const key of ["updatedAfter", "updatedBefore"] as const) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters[key])) filters[key] = "";
  }
  return { tab: workspaceTabs.includes(requested) ? requested : "overview", filters, view: params.get("view") === "list" ? "list" : "grid" };
}

export function workspaceLocationHref(path: string, location: WorkspaceLocation): string {
  const params = new URLSearchParams();
  if (location.tab !== "overview") params.set("tab", location.tab);
  for (const key of Object.keys(filterParams) as (keyof ProjectFilters)[]) {
    if (location.filters[key] !== defaultFilters[key]) params.set(filterParams[key], location.filters[key]);
  }
  if (location.view !== "grid") params.set("view", location.view);
  return `${path}${params.size ? `?${params}` : ""}`;
}

export function projectsHref(role: string): string {
  return `${role === "admin" ? "/admin" : "/portal"}?tab=projects`;
}

export function projectSignInHref(projectId: string): string {
  return `/portal?next=${encodeURIComponent(`/projects/${encodeURIComponent(projectId)}`)}`;
}

export function projectReturnPath(href: string): string | null {
  const next = new URL(href, "https://workspace.invalid").searchParams.get("next");
  return next && /^\/projects\/[^/?#\\]+(?:\/poles\/[^/?#\\]+\/report)?$/.test(next) ? next : null;
}
