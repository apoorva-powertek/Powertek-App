"use client";

import { useMemo, useState } from "react";
import type { ProjectRow } from "@/components/portal-app";
import type { ImportAttachment, ImportPole } from "@/lib/portal-types";
import { Check, CloudUpload, FileArchive, FileJson2, FileSpreadsheet, Image as ImageIcon, LoaderCircle, ShieldCheck } from "lucide-react";

type JsonMeasurement = Partial<ImportPole> & { matchKey: string; rawJson: unknown };
type UploadEntry = { name: string; bytes: Uint8Array; type: string };

const numberKeys = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizedKey = (value: string) => value.toUpperCase().replace(/\.(JSON|JPE?G|PNG|WEBP|HEIC|CSV|XLSX?)$/i, "").replace(/FULL.?PROJECT|PROJECT|PHOTO|IMAGE|IMG/g, "").replace(/[^A-Z0-9]/g, "");
const cleanHeader = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ""; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((item) => cleanHeader(item));
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""])));
}

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (row[key] !== undefined && row[key] !== "") return row[key];
  return null;
}

async function readSpreadsheet(file: File): Promise<Record<string, unknown>[]> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [cleanHeader(key), value])));
}

function rowsToPoles(rows: Record<string, unknown>[]): ImportPole[] {
  const poles: ImportPole[] = [];
  for (const row of rows) {
    const poleName = String(pick(row, ["name", "pole_id", "poleid", "pole_name", "pole", "id"]) ?? "").trim();
    const latitude = numberKeys(pick(row, ["lat", "latitude", "gps_latitude"]));
    const longitude = numberKeys(pick(row, ["lon", "lng", "longitude", "gps_longitude"]));
    const elevationM = numberKeys(pick(row, ["elevation_m", "ground_elevation_m", "ground_elevation", "elevation", "elev"]));
    if (!poleName || latitude === null || longitude === null || elevationM === null) continue;
    poles.push({
      poleName, latitude, longitude, elevationM,
      topHeightM: numberKeys(pick(row, ["top", "top_height", "top_height_m", "pole_top", "pole_top_m"])),
      poleHeightFt: numberKeys(pick(row, ["height", "pole_height", "pole_height_ft", "height_ft"])),
      poleClass: pick(row, ["class", "pole_class"]) == null ? null : String(pick(row, ["class", "pole_class"])),
      attachments: [],
    });
  }
  return poles;
}

function findPrimitive(root: unknown, wanted: string[]): unknown {
  const queue: unknown[] = [root];
  const names = new Set(wanted.map(cleanHeader));
  let steps = 0;
  while (queue.length && steps < 12000) {
    const value = queue.shift(); steps += 1;
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (names.has(cleanHeader(key)) && (typeof child === "string" || typeof child === "number" || Array.isArray(child))) return child;
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return null;
}

function extractPoint(root: unknown, keys: string[]): [number | null, number | null] {
  const value = findPrimitive(root, keys);
  if (Array.isArray(value) && value.length >= 2) return [numberKeys(value[0]), numberKeys(value[1])];
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return [numberKeys(pick(object, ["x", "photo_x", "pixel_x"])), numberKeys(pick(object, ["y", "photo_y", "pixel_y"]))];
  }
  return [null, null];
}

function extractAttachments(root: unknown): ImportAttachment[] {
  const output: ImportAttachment[] = [];
  const seen = new Set<string>();
  const visit = (value: unknown, parentKey = "", depth = 0) => {
    if (!value || typeof value !== "object" || depth > 11) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, parentKey, depth + 1)); return; }
    const object = value as Record<string, unknown>;
    const normalized = Object.fromEntries(Object.entries(object).map(([key, child]) => [cleanHeader(key), child]));
    const rawHeight = pick(normalized, ["attachment_height", "attachment_height_m", "height_m", "measured_height", "height_above_ground", "height"]);
    const heightM = numberKeys(rawHeight);
    const rawName = pick(normalized, ["attachment_name", "label", "name", "title", "type", "description"]);
    const name = String(rawName ?? parentKey).trim();
    if (heightM !== null && heightM > 0 && heightM < 100 && name && !/^(POINT|ITEM|OBJECT|DATA|HEIGHT)$/i.test(name)) {
      const directPoint = (pick(normalized, ["photo_point", "image_point", "pixel", "position", "point"]) ?? object) as unknown;
      let [photoX, photoY] = extractPoint(directPoint, ["photo_point", "image_point", "pixel", "position", "point"]);
      if (photoX === null) photoX = numberKeys(pick(normalized, ["photo_x", "pixel_x", "x"]));
      if (photoY === null) photoY = numberKeys(pick(normalized, ["photo_y", "pixel_y", "y"]));
      const sideValue = String(pick(normalized, ["side", "photo_side", "label_side"]) ?? "right").toLowerCase();
      const key = `${name.toUpperCase()}|${heightM.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        output.push({ name, heightM, photoX, photoY, side: sideValue.includes("left") ? "left" : "right", color: String(pick(normalized, ["color", "source_color", "hex"]) ?? "") || null });
      }
    }
    for (const [key, child] of Object.entries(object)) if (child && typeof child === "object") visit(child, key, depth + 1);
  };
  visit(root);
  return output.sort((a, b) => b.heightM - a.heightM);
}

function extractMeasurement(json: unknown, filename: string): JsonMeasurement {
  const attachments = extractAttachments(json);
  const [baseX, baseY] = extractPoint(json, ["base", "pole_base", "base_point", "ground_point"]);
  const [topX, topY] = extractPoint(json, ["top", "pole_top", "top_point"]);
  const poleLabel = String(findPrimitive(json, ["pole_id", "pole_name", "poleid", "structure_id"]) ?? filename.replace(/\.json$/i, ""));
  const imageFilename = String(findPrimitive(json, ["source_image", "image_filename", "photo_filename", "image_name"]) ?? "") || null;
  return {
    matchKey: normalizedKey(poleLabel || filename),
    sourceJsonFilename: filename,
    imageFilename,
    imageWidth: numberKeys(findPrimitive(json, ["image_width", "photo_width", "width_pixels"])),
    imageHeight: numberKeys(findPrimitive(json, ["image_height", "photo_height", "height_pixels"])),
    modelVersion: String(findPrimitive(json, ["model_version", "version"]) ?? "") || null,
    toolName: String(findPrimitive(json, ["tool", "tool_name"]) ?? "") || null,
    baseX, baseY, topX, topY, attachments, rawJson: json,
  };
}

async function entriesFromFiles(files: File[], extensions: RegExp): Promise<UploadEntry[]> {
  const { unzipSync } = await import("fflate");
  const entries: UploadEntry[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name)) {
      const unpacked = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [name, bytes] of Object.entries(unpacked)) if (extensions.test(name) && !name.includes("/__MACOSX/")) entries.push({ name: name.split("/").pop() || name, bytes, type: mimeFromName(name) });
    } else if (extensions.test(file.name)) entries.push({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), type: file.type || mimeFromName(file.name) });
  }
  return entries;
}

function mimeFromName(name: string) {
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.heic$/i.test(name)) return "image/heic";
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.csv$/i.test(name)) return "text/csv";
  return "application/octet-stream";
}

function bestPoleMatch(name: string, poles: ImportPole[]) {
  const key = normalizedKey(name);
  return poles.find((pole) => normalizedKey(pole.poleName) === key)
    ?? poles.find((pole) => key.includes(normalizedKey(pole.poleName)) || normalizedKey(pole.poleName).includes(key));
}

async function uploadEntry(projectId: string, kind: "image" | "json" | "spreadsheet", name: string, body: Blob | File | Uint8Array, poleName?: string) {
  const params = new URLSearchParams({ kind, filename: name });
  if (poleName) params.set("poleName", poleName);
  const payload = body instanceof Uint8Array ? new Blob([body.buffer as ArrayBuffer], { type: mimeFromName(name) }) : body;
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files?${params}`, { method: "PUT", headers: { "content-type": payload.type || mimeFromName(name) }, body: payload });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || `Could not upload ${name}`);
}

export function ImportDialog({ projects, onComplete }: { projects: ProjectRow[]; onComplete: (message: string) => Promise<void> | void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [spreadsheet, setSpreadsheet] = useState<File | null>(null);
  const [jsonFiles, setJsonFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Ready to validate files");
  const [error, setError] = useState("");
  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId), [projectId, projects]);

  async function importProject() {
    if (!projectId || !spreadsheet) { setError("Choose a project and location spreadsheet first"); return; }
    setBusy(true); setError(""); setProgress(3);
    try {
      setPhase("Reading pole locations");
      const poles = rowsToPoles(await readSpreadsheet(spreadsheet));
      if (!poles.length) throw new Error("No poles found. The sheet needs pole name, latitude, longitude, and elevation columns.");
      setProgress(12);
      setPhase("Reading measurement JSON");
      const jsonEntries = await entriesFromFiles(jsonFiles, /\.json$/i);
      const measurements: JsonMeasurement[] = [];
      for (const entry of jsonEntries) {
        try { measurements.push(extractMeasurement(JSON.parse(new TextDecoder().decode(entry.bytes)), entry.name)); }
        catch { throw new Error(`${entry.name} is not valid JSON`); }
      }
      for (const pole of poles) {
        const key = normalizedKey(pole.poleName);
        const measurement = measurements.find((item) => item.matchKey === key || item.matchKey.includes(key) || key.includes(item.matchKey));
        if (measurement) Object.assign(pole, measurement, { poleName: pole.poleName });
      }
      setProgress(22); setPhase(`Saving ${poles.length} pole records`);
      const metadataResponse = await fetch(`/api/projects/${encodeURIComponent(projectId)}/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ poles, sourceName: spreadsheet.name }) });
      const metadata = await metadataResponse.json().catch(() => ({})) as { error?: string; importedAttachments?: number };
      if (!metadataResponse.ok) throw new Error(metadata.error || "Could not save pole records");
      setProgress(30); setPhase("Saving original source files");
      await uploadEntry(projectId, "spreadsheet", spreadsheet.name, spreadsheet);
      let completed = 0;
      const imageEntries = await entriesFromFiles(imageFiles, /\.(jpe?g|png|webp|heic)$/i);
      const totalFiles = Math.max(1, jsonEntries.length + imageEntries.length);
      for (const entry of jsonEntries) {
        const matched = bestPoleMatch(entry.name, poles);
        await uploadEntry(projectId, "json", entry.name, entry.bytes, matched?.poleName);
        completed += 1; setProgress(30 + Math.round((completed / totalFiles) * 65)); setPhase(`Uploading source files ${completed} of ${totalFiles}`);
      }
      for (const entry of imageEntries) {
        const matched = bestPoleMatch(entry.name, poles);
        await uploadEntry(projectId, "image", entry.name, entry.bytes, matched?.poleName);
        completed += 1; setProgress(30 + Math.round((completed / totalFiles) * 65)); setPhase(`Uploading full-quality photos ${completed} of ${totalFiles}`);
      }
      setProgress(100); setPhase("Import complete");
      await onComplete(`${poles.length} poles and ${metadata.importedAttachments ?? 0} attachment heights imported`);
      window.setTimeout(() => window.location.assign(`/projects/${encodeURIComponent(projectId)}`), 650);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed"); setPhase("Import stopped");
    } finally { setBusy(false); }
  }

  return <section className="import-layout">
    <div className="import-card">
      <div className="card-heading"><span><CloudUpload /></span><div><p className="eyebrow">SECURE PROJECT IMPORT</p><h2>Upload survey package</h2></div></div>
      <label className="import-project">Destination project<select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Choose project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.client_name} — {project.name}</option>)}</select></label>
      <div className="upload-steps">
        <UploadField number="01" icon={<FileSpreadsheet />} title="Pole locations" detail="CSV or Excel • name, latitude, longitude, elevation, pole top, height, class" accept=".csv,.xlsx,.xls" onFiles={(files) => setSpreadsheet(files[0] ?? null)} filenames={spreadsheet ? [spreadsheet.name] : []} />
        <UploadField number="02" icon={<FileJson2 />} title="Measurement JSON" detail="JSON files or one ZIP • exact attachment heights and photo points" accept=".json,.zip" multiple onFiles={setJsonFiles} filenames={jsonFiles.map((file) => file.name)} />
        <UploadField number="03" icon={<ImageIcon />} title="Original pole photos" detail="JPG, PNG, WebP, HEIC, or ZIP • originals are never resized" accept=".jpg,.jpeg,.png,.webp,.heic,.zip" multiple onFiles={setImageFiles} filenames={imageFiles.map((file) => file.name)} />
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button className="orange-button import-button" disabled={busy || !spreadsheet || !projectId} onClick={() => void importProject()}>{busy ? <LoaderCircle className="spin" /> : <CloudUpload />} {busy ? phase : "Validate and import project"}</button>
      {busy && <div className="import-progress"><span><i style={{ width: `${progress}%` }} /></span><p>{phase}<b>{progress}%</b></p></div>}
    </div>
    <aside className="quality-card"><span><ShieldCheck /></span><p className="eyebrow">FULL-RESOLUTION PIPELINE</p><h2>Sharp at every useful zoom level.</h2><p>Each original image is uploaded directly to protected object storage. The viewer uses the original pixel dimensions—no embedded thumbnail or base64 downsampling.</p><ul><li><Check /> Original image bytes preserved</li><li><Check /> Server-side project permission checks</li><li><Check /> JSON matched by normalized pole ID</li><li><Check /> Single-pole and complete-project export</li></ul><div className="quality-note"><FileArchive /><span><strong>ZIP supported</strong><small>For very large projects, individual files or smaller ZIP batches use less browser memory.</small></span></div>{selectedProject && <div className="destination"><small>IMPORT DESTINATION</small><strong>{selectedProject.client_name}</strong><span>{selectedProject.name}</span></div>}</aside>
  </section>;
}

function UploadField({ number, icon, title, detail, accept, multiple, onFiles, filenames }: { number: string; icon: React.ReactNode; title: string; detail: string; accept: string; multiple?: boolean; onFiles: (files: File[]) => void; filenames: string[] }) {
  return <label className={`upload-field ${filenames.length ? "has-file" : ""}`}><input type="file" accept={accept} multiple={multiple} onChange={(event) => onFiles(Array.from(event.target.files ?? []))} /><span className="upload-number">{number}</span><span className="upload-icon">{filenames.length ? <Check /> : icon}</span><span className="upload-copy"><strong>{title}</strong><small>{filenames.length ? `${filenames.length} selected • ${filenames.slice(0, 2).join(", ")}${filenames.length > 2 ? "…" : ""}` : detail}</small></span><span className="browse-pill">Browse</span></label>;
}
