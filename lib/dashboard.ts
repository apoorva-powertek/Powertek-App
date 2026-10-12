export type DashboardProject = {
  id: string; client_id: string; client_name: string; name: string; code: string;
  description: string; location_label: string; status: string; pole_count: number;
  complete_count: number; attachment_count: number; created_at?: string; updated_at?: string; can_upload?: boolean;
};
export type ProjectFilters = { query: string; clientId: string; status: string; progress: string; updatedAfter: string; updatedBefore: string; sort: string };
export const defaultFilters: ProjectFilters = { query: "", clientId: "all", status: "all", progress: "all", updatedAfter: "", updatedBefore: "", sort: "recent" };
export function progressPercent(project: DashboardProject) {
  return project.pole_count ? Math.min(100, Math.round(project.complete_count / project.pole_count * 100)) : 0;
}
export function filterProjects(projects: DashboardProject[], filters: ProjectFilters): DashboardProject[] {
  const query = filters.query.trim().toLowerCase();
  return projects.filter((project) => {
    const progress = progressPercent(project);
    const updated = project.updated_at?.slice(0, 10) || "";
    return (!query || [project.name, project.code, project.client_name, project.location_label].some((field) => field?.toLowerCase().includes(query)))
      && (filters.clientId === "all" || project.client_id === filters.clientId)
      && (filters.status === "all" || project.status === filters.status)
      && (filters.progress === "all" || (filters.progress === "not_started" ? project.complete_count === 0 : filters.progress === "complete" ? project.pole_count > 0 && progress === 100 : project.complete_count > 0 && progress < 100))
      && (!filters.updatedAfter || updated >= filters.updatedAfter)
      && (!filters.updatedBefore || Boolean(updated && updated <= filters.updatedBefore));
  }).sort((a, b) => filters.sort === "name" ? a.name.localeCompare(b.name)
    : filters.sort === "progress" ? progressPercent(b) - progressPercent(a)
    : (b.updated_at || "").localeCompare(a.updated_at || ""));
}
export function summarizeProjects(projects: DashboardProject[]) {
  const poles = projects.reduce((sum, p) => sum + Number(p.pole_count), 0);
  const complete = projects.reduce((sum, p) => sum + Number(p.complete_count), 0);
  return { projects: projects.length, poles, complete, remaining: Math.max(0, poles - complete), attachments: projects.reduce((sum, p) => sum + Number(p.attachment_count), 0), progress: poles ? Math.min(100, Math.round(complete / poles * 100)) : 0 };
}
