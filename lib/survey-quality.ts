import type { ImportPole } from "./portal-types";
export const maxSourceFileBytes = 50 * 1024 * 1024;
export const reviewStages = ["draft", "uploaded", "needs_review", "approved", "delivered"] as const;
export type ReviewStage = typeof reviewStages[number];
export const reviewLabels: Record<ReviewStage, string> = { draft: "Draft", uploaded: "Uploaded", needs_review: "Needs review", approved: "Approved", delivered: "Delivered" };
export function reviewActions(stage: ReviewStage, admin: boolean): ReviewStage[] {
  if (stage === "draft") return ["uploaded"];
  if (stage === "uploaded") return ["needs_review"];
  if (stage === "needs_review") return admin ? ["approved", "uploaded"] : ["uploaded"];
  if (stage === "approved") return admin ? ["delivered", "uploaded"] : ["uploaded"];
  return ["uploaded"];
}
export const poleKey = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
export type ImportFileManifest = { name: string; kind: "image" | "json" | "spreadsheet"; size: number; type: string; poleName?: string; objectKey: string };
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);
export function validateSurveyPoles(value: unknown): { poles: ImportPole[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(value) || !value.length || value.length > 5000) return { poles: [], errors: ["Choose between 1 and 5,000 pole records."] };
  const seen = new Set<string>();
  const poles = value.map((raw, index) => {
    const p = (raw && typeof raw === "object" ? raw : {}) as ImportPole;
    const name = typeof p.poleName === "string" ? p.poleName.trim() : "";
    const label = name || `Row ${index + 2}`, key = poleKey(name);
    if (!key || name.length > 120) errors.push(`${label}: enter a pole name of up to 120 characters.`);
    if (seen.has(key)) errors.push(`${label}: duplicate pole ID after removing spaces and punctuation.`);
    seen.add(key);
    if (!finite(p.latitude) || p.latitude < -90 || p.latitude > 90) errors.push(`${label}: latitude must be between -90 and 90.`);
    if (!finite(p.longitude) || p.longitude < -180 || p.longitude > 180) errors.push(`${label}: longitude must be between -180 and 180.`);
    if (!finite(p.elevationM)) errors.push(`${label}: ground elevation is required.`);
    for (const field of ["topHeightM", "poleHeightFt", "imageWidth", "imageHeight", "baseX", "baseY", "topX", "topY"] as const) {
      if (p[field] != null && !finite(p[field])) errors.push(`${label}: ${field} must be a number.`);
    }
    const attachments = p.attachments ?? [];
    if (!Array.isArray(attachments) || attachments.length > 500) errors.push(`${label}: at most 500 attachments are allowed.`);
    for (const a of Array.isArray(attachments) ? attachments : []) {
      if (!a || typeof a.name !== "string" || !a.name.trim() || a.name.length > 180 || !finite(a.heightM) || a.heightM <= 0 || a.heightM > 100) errors.push(`${label}: each attachment needs a name and a height above 0 and up to 100 m.`);
    }
    if (p.imageWidth != null && (!Number.isSafeInteger(p.imageWidth) || p.imageWidth <= 0)) errors.push(`${label}: image width must be a positive whole number.`);
    if (p.imageHeight != null && (!Number.isSafeInteger(p.imageHeight) || p.imageHeight <= 0)) errors.push(`${label}: image height must be a positive whole number.`);
    const { rawJson: _raw, ...metadata } = p;
    void _raw;
    return { ...metadata, poleName: name, attachments };
  });
  return { poles, errors };
}
