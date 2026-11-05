import type {PoleRecord} from "./portal-types";
import type {ProjectInfo} from "./project-types";
import {authenticatedFetch} from "./supabase";
const meters = (value: number | null | undefined, digits = 2) => value == null ? "—" : `${Number(value).toFixed(digits)} m`;
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const sourceFilename=(value:string)=>value.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,180)||'photo';
const safeName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "pole";

const projectImageUrl=(projectId:string,poleId:string)=>`/api/projects/${encodeURIComponent(projectId)}/poles/${encodeURIComponent(poleId)}/image`;
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function poleCsv(pole: PoleRecord) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows: unknown[][] = [["Pole ID", "Latitude", "Longitude", "Ground elevation (m)", "Pole top (m)", "Pole height (ft)", "Pole class", "Attachment", "Attachment height (m)", "Photo side"]];
  if (!pole.attachments.length) rows.push([pole.poleName, pole.latitude, pole.longitude, pole.elevationM, pole.topHeightM, pole.poleHeightFt, pole.poleClass, "", "", ""]);
  for (const item of pole.attachments) rows.push([pole.poleName, pole.latitude, pole.longitude, pole.elevationM, pole.topHeightM, pole.poleHeightFt, pole.poleClass, item.name, item.heightM, item.side]);
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}

function reportHtml(project: ProjectInfo, pole: PoleRecord) {
  const rows = pole.attachments.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${item.heightM.toFixed(3)} m</td><td>${escapeHtml(item.side)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(pole.poleName)} report</title><style>body{font:14px Arial;color:#15212c;margin:40px}header{border-bottom:4px solid #f47d35;padding-bottom:14px}h1{margin:8px 0}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.meta div{border:1px solid #ccd5db;padding:12px}.meta small{display:block;color:#647583;margin-bottom:5px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #c8d1d8;padding:9px;text-align:left}th{background:#edf2f5}footer{margin-top:30px;color:#6c7d89;font-size:11px}@media print{body{margin:18mm}}</style></head><body><header><b>POWERTEK • POLE INTELLIGENCE</b><h1>${escapeHtml(pole.poleName)}</h1><span>${escapeHtml(project.client_name)} / ${escapeHtml(project.name)}</span></header><section class="meta"><div><small>LATITUDE</small><b>${pole.latitude}</b></div><div><small>LONGITUDE</small><b>${pole.longitude}</b></div><div><small>GROUND ELEVATION</small><b>${pole.elevationM.toFixed(2)} m</b></div><div><small>POLE TOP</small><b>${meters(pole.topHeightM)}</b></div><div><small>POLE HEIGHT</small><b>${pole.poleHeightFt ?? "—"} ft</b></div><div><small>POLE CLASS</small><b>${escapeHtml(pole.poleClass ?? "—")}</b></div></section><h2>Attachment schedule</h2><table><thead><tr><th>Attachment</th><th>Height above ground</th><th>Photo side</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No measured attachments</td></tr>`}</tbody></table><footer>Generated from Powertek Pole Portal • ${new Date().toISOString()}</footer></body></html>`;
}

export async function exportSurvey(project:ProjectInfo,poles:PoleRecord[],onProgress:(message:string)=>void,onePole?:PoleRecord){
const data={project,poles},projectId=project.id;let notice='';const setExporting=onProgress,setDownloadNotice=(value:string)=>{notice=value;},setError=(value:string)=>{if(value)throw new Error(value);};
async function downloadPole(pole:PoleRecord){
    if (!data) return; setError("");setDownloadNotice("");setExporting(`Preparing ${pole.poleName}`);
    try {
      const { strToU8, zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {
        [`${safeName(pole.poleName)}_data.json`]: strToU8(JSON.stringify({ project: data.project, pole }, null, 2)),
        [`${safeName(pole.poleName)}_attachments.csv`]: strToU8(poleCsv(pole)),
        [`${safeName(pole.poleName)}_report.html`]: strToU8(reportHtml(data.project, pole)),
      };
      let missingPhoto=false;
      if(pole.imageFilename&&pole.photoAvailable===false)missingPhoto=true;
      if (pole.imageFilename&&pole.photoAvailable!==false) {
        const response = await authenticatedFetch(projectImageUrl(projectId, pole.id));
        if(response.ok)files[`original_photo/${sourceFilename(pole.imageFilename)}`]=new Uint8Array(await response.arrayBuffer());else missingPhoto=true;
      }
      if(missingPhoto)files['MISSING_PHOTO.txt']=strToU8(`The original photo ${pole.imageFilename} was unavailable. Upload it again through the project workspace. Survey records and measurements are included.`);
      downloadBlob(new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" }), `${safeName(pole.poleName)}_pole_package.zip`);
      setDownloadNotice(missingPhoto?'Pole package downloaded with records and measurements. Its original photo is missing; see MISSING_PHOTO.txt.':'Pole package downloaded.');
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create pole package"); }
    finally { setExporting(""); }
  }
async function downloadAll(){
    if (!data?.poles.length) return; setError("");setDownloadNotice("");setExporting("Preparing complete project package");
    try {
      const { strToU8, zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};const missingPhotos:string[]=[];let photoBytes=0;
      const combined = data.poles.flatMap((pole) => poleCsv(pole).split(/\r?\n/).slice(1));
      files[`${safeName(data.project.code)}_all_poles.csv`] = strToU8(`"Pole ID","Latitude","Longitude","Ground elevation (m)","Pole top (m)","Pole height (ft)","Pole class","Attachment","Attachment height (m)","Photo side"\r\n${combined.join("\r\n")}`);
      files[`${safeName(data.project.code)}_all_poles.json`] = strToU8(JSON.stringify({ project: data.project, poles: data.poles }, null, 2));
      for (let index = 0; index < data.poles.length; index += 1) {
        const pole = data.poles[index];
        setExporting(`Collecting original photo ${index + 1} of ${data.poles.length}`);
        files[`reports/${safeName(pole.poleName)}.html`] = strToU8(reportHtml(data.project, pole));
        if (!pole.imageFilename) continue;
        if(pole.photoAvailable===false){missingPhotos.push(`${pole.poleName}: ${pole.imageFilename}`);continue;}
        const response = await authenticatedFetch(projectImageUrl(projectId, pole.id));
        if(response.ok){const bytes=new Uint8Array(await response.arrayBuffer());photoBytes+=bytes.byteLength;if(photoBytes>104857600)throw new Error('Photos exceed the 100 MB download limit. Download individual poles or source files instead.');files[`original_photos/${safeName(pole.poleName)}-${sourceFilename(pole.imageFilename)}`]=bytes;}else missingPhotos.push(`${pole.poleName}: ${pole.imageFilename}`);
      }
      if(missingPhotos.length)files['MISSING_PHOTOS.txt']=strToU8(`The following original photos were unavailable. Survey records and reports are included. Upload the matching originals through Upload data to restore them.\n\n${missingPhotos.join('\n')}`);
      setExporting("Preparing your download…");
      downloadBlob(new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" }), `${safeName(data.project.code)}_all_poles.zip`);
      setDownloadNotice(missingPhotos.length?`Project downloaded. ${missingPhotos.length} original photos were unavailable; see MISSING_PHOTOS.txt in the package.`:"Project package downloaded.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create project package"); }
    finally { setExporting(""); }
  }

await (onePole?downloadPole(onePole):downloadAll());return notice;
}
