export function qualityErrorResponse(error: unknown): Response | null {
  const value = error as { code?: string; message?: string };
  const status = ["40001","40P01"].includes(value?.code ?? "") ? 409 : value?.code === "42501" ? 403 : ["22023", "22P02", "23514", "23505"].includes(value?.code ?? "") ? 400 : 0;
  return status ? Response.json({ error: value.message || "Check the survey details and try again." }, { status }) : null;
}
