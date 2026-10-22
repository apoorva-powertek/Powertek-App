import type { ImportAttachment, ImportPole } from "./portal-types";
import { maxSourceFileBytes, validateSurveyPoles, type ImportFileManifest } from "./survey-quality";
type JsonMeasurement = Partial<ImportPole> & { matchKey: string; rawJson: unknown };
type UploadEntry = { name: string; bytes: Uint8Array; type: string };

const numberKeys = (value: unknown) => {
  if (value == null || String(value).trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizedKey = (value: string) => value.toUpperCase().replace(/\.(JSON|JPE?G|PNG|WEBP|HEIC|CSV|XLSX?)$/i, "").replace(/[^A-Z0-9]/g, "");
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
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (value || row.length) { row.push(value); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((item) => cleanHeader(item));
  if (headers.some(h=>!h) || new Set(headers).size!==headers.length) throw new Error("CSV headers must be nonempty and unique.");
  if (rows.slice(1).some(r=>r.length!==headers.length)) throw new Error("A CSV row has a different number of columns. Check commas and quotes.");
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
    // Keep invalid rows so validation can explain every problem.
    
    poles.push({
      poleName, latitude: latitude as number, longitude: longitude as number, elevationM: elevationM as number,
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
      if (names.has(cleanHeader(key)) && child != null) return child;
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
      let unpackedSize = 0;
      const unpacked = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => {
        if (!extensions.test(entry.name)) return false;
        unpackedSize += entry.originalSize;
        if (unpackedSize > 524288000 || entry.originalSize > maxSourceFileBytes) throw new Error("ZIP exceeds 500 MB expanded or contains a file over 50 MB. Use smaller files.");
        return true;
      } });
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


export type SurveyPackage = { id: string; projectId: string; sourceName: string; poles: ImportPole[]; files: (ImportFileManifest & { blob: Blob })[]; warnings: string[]; existing: string[] };
export async function readSurveyPackage(projectId: string, spreadsheet: File, jsonFiles: File[], imageFiles: File[], existingNames: string[]): Promise<SurveyPackage> {
  if ([spreadsheet,...jsonFiles,...imageFiles].reduce((sum,f)=>sum+f.size,0)>524288000) throw new Error("This package exceeds 500 MB. Split it into smaller batches.");
  if ([spreadsheet,...jsonFiles,...imageFiles].some(f=>!/\.zip$/i.test(f.name)&&f.size>maxSourceFileBytes)) throw new Error("Each source file must be 50 MB or smaller. Split large files before importing.");
  const poles = rowsToPoles(await readSpreadsheet(spreadsheet));
  let validated = validateSurveyPoles(poles);
  if (validated.errors.length) throw new Error(validated.errors.slice(0,10).join("\n"));
  const jsonEntries = await entriesFromFiles(jsonFiles,/\.json$/i), imageEntries = await entriesFromFiles(imageFiles,/\.(jpe?g|png|webp|heic)$/i);
  const warnings: string[] = [], measurements = new Map<string,JsonMeasurement>();
  const filePoles = new Map<string,string>();
  for (const entry of jsonEntries) {
    let measurement: JsonMeasurement;
    try { measurement = extractMeasurement(JSON.parse(new TextDecoder().decode(entry.bytes)),entry.name); }
    catch { throw new Error(`${entry.name} is not valid measurement JSON.`); }
    const matched = poles.find(p=>normalizedKey(p.poleName)===measurement.matchKey);
    if (!matched) { warnings.push(`${entry.name}: no exact pole ID match; saved as an unlinked source file.`); continue; }
    if (measurements.has(matched.poleName)) throw new Error(`Multiple JSON files match ${matched.poleName}. Keep one measurement file per pole.`);
    measurements.set(matched.poleName,measurement); filePoles.set(entry.name,matched.poleName);
    Object.assign(matched,measurement,{poleName:matched.poleName});
  }
  const id=crypto.randomUUID(), safe=(name:string)=>name.replace(/[\\/\u0000-\u001f]/g,"_").slice(0,180);
  const files: SurveyPackage["files"]=[{ name:safe(spreadsheet.name),kind:"spreadsheet",size:spreadsheet.size,type:spreadsheet.type||mimeFromName(spreadsheet.name),objectKey:`${projectId}/imports/${id}/0-${safe(spreadsheet.name)}`,blob:spreadsheet }];
  const imagePoles=new Set<string>();
  for (const [kind,entries] of [["json",jsonEntries],["image",imageEntries]] as const) for (const entry of entries) {
    let poleName = kind==="json" ? filePoles.get(entry.name) : undefined;
    if (kind==="image") {
      const candidates=poles.filter(p=>normalizedKey(p.poleName)===normalizedKey(entry.name)||p.imageFilename?.toLowerCase()===entry.name.toLowerCase());
      if (candidates.length>1) throw new Error(`${entry.name} matches more than one pole. Rename the photo to the exact pole ID.`);
      poleName=candidates[0]?.poleName;
      if (poleName && imagePoles.has(poleName)) throw new Error(`Multiple photos match ${poleName}. Keep one original photo per pole.`);
      if (poleName) imagePoles.add(poleName);
      else warnings.push(`${entry.name}: no exact pole ID match; saved as an unlinked source file.`);
    }
    if (!entry.bytes.byteLength) throw new Error(`${entry.name} is empty.`);
    files.push({name:safe(entry.name),kind,size:entry.bytes.byteLength,type:entry.type,poleName,objectKey:`${projectId}/imports/${id}/${files.length}-${safe(entry.name)}`,blob:new Blob([entry.bytes.buffer as ArrayBuffer],{type:entry.type})});
  }
  if (files.length>10000 || files.reduce((sum,f)=>sum+f.size,0)>524288000) throw new Error("Expanded package exceeds 500 MB or 10,000 files. Use smaller batches.");
  validated=validateSurveyPoles(poles);
  if(validated.errors.length) throw new Error(validated.errors.slice(0,10).join("\n"));
  const existing=validated.poles.filter(p=>existingNames.includes(p.poleName)).map(p=>p.poleName);
  if(existing.length) warnings.push(`${existing.length} existing poles will be updated. Their attachments will be replaced and their review stage will return to Uploaded.`);
  const missingPhotos=poles.length-imagePoles.size;
  if(missingPhotos) warnings.push(`${missingPhotos} poles have no new matching photo. Existing photos will be kept; approval requires a stored photo and measured attachments.`);
  return {id,projectId,sourceName:spreadsheet.name.slice(0,180),poles:validated.poles,files,warnings,existing};
}
