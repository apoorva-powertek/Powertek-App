"use client";
import Image from "next/image";
import { ProjectFilesPanel } from "./project-files-panel";
import { ProjectWorkflowDialog, WorkspaceDialog } from "./workflow-dialog";
import { ActivityLog, SurveyReview } from "./survey-quality";
import { reviewLabels, reviewStages, type ReviewStage } from "@/lib/survey-quality";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {fitSurveyViewport,worldPoint,pointToLonLat,mapPixelX} from "@/lib/map-viewport";
import { projectsHref } from "@/lib/workspace-navigation";
import type { AttachmentRecord, PoleRecord, PortalUser } from "@/lib/portal-types";
import { ThemeControl } from "@/components/theme-control";
import { authenticatedFetch } from "@/lib/supabase";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ClipboardCheck, CloudUpload, History, Crosshair, Download, ExternalLink, X,
  FileArchive, Focus, Image as ImageIcon, Layers3, ListFilter, LoaderCircle, LocateFixed,
  LogOut, Map as MapIcon, Maximize2, Menu, Minus, Plus, Ruler, Search, SplitSquareVertical,
} from "lucide-react";

type ProjectInfo = { id: string; name: string; code: string; description: string; location_label: string; status: string; client_id: string; client_name: string; client_code: string };
type ProjectPayload = { canEdit?: boolean; project: ProjectInfo; poles: PoleRecord[] };
type ViewName = "map" | "split" | "photo" | "profile" | "files";

function Brand() { return <div className="portal-brand compact"><Image src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority /></div>; }
function projectImageUrl(projectId: string, poleId: string) { return `/api/projects/${encodeURIComponent(projectId)}/poles/${encodeURIComponent(poleId)}/image`; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const meters = (value: number | null | undefined, digits = 2) => value == null ? "—" : `${Number(value).toFixed(digits)} m`;
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const sourceFilename=(value:string)=>value.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,180)||'photo';
const safeName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "pole";

function attachmentStyle(name: string) {
  const value = name.toUpperCase();
  if (/PRIMARY|HIGH.?VOLT|PHASE/.test(value)) return { color: "#ff8250", kind: "primary", label: "Primary" };
  if (/NEUTRAL|SECONDARY/.test(value)) return { color: "#f5b83b", kind: "neutral", label: "Neutral" };
  if (/COMM|TEL|CATV|FIBER|PHONE/.test(value)) return { color: "#5da9ff", kind: "communication", label: "Communication" };
  if (/GUY|ANCHOR/.test(value)) return { color: "#66d8b6", kind: "guy", label: "Guy" };
  if (/INSULATOR|PIN|SPOOL|DEAD.?END/.test(value)) return { color: "#d5b7ff", kind: "insulator", label: "Insulator" };
  if (/TRANSFORMER/.test(value)) return { color: "#ed93ff", kind: "transformer", label: "Transformer" };
  if (/CUTOUT|FUSE|SWITCH|LIGHT|METER|CABINET|ANTENNA|RISER|EQUIPMENT/.test(value)) return { color: "#4fdcc4", kind: "equipment", label: "Equipment" };
  return { color: "#a9bdcc", kind: "attachment", label: "Attachment" };
}

async function fetchProject(projectId: string): Promise<ProjectPayload> {
  const response = await authenticatedFetch(`/api/projects/${encodeURIComponent(projectId)}/poles`);
  const data = await response.json().catch(() => ({})) as Partial<ProjectPayload> & { error?: string };
  if (!response.ok) throw new Error(data.error || "Could not load project");
  return data as ProjectPayload;
}

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

export function ProjectViewer({ projectId, user, signOutPath, onSignOut }: { projectId: string; user: PortalUser; signOutPath: string; onSignOut?: () => void }) {
  const [data, setData] = useState<ProjectPayload | null>(null);
  const [polesOpen, setPolesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<ViewName>("map");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "complete" | "location">("all");
  const [reviewFilter,setReviewFilter]=useState<"all"|ReviewStage>("all");
  const [revision,setRevision]=useState(0);
  const [workflowOpen,setWorkflowOpen]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [poleFiltersOpen,setPoleFiltersOpen]=useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [focusAttachment, setFocusAttachment] = useState<AttachmentRecord | null>(null);

  useEffect(() => { void fetchProject(projectId).then((payload) => { setData(payload); setSelectedId(payload.poles[0]?.id ?? ""); }).catch((err) => setError(err instanceof Error ? err.message : "Could not load project")); }, [projectId]);
  const visiblePoles = useMemo(() => (data?.poles ?? []).filter((pole) => {
    const match = !query.trim() || pole.poleName.toLowerCase().includes(query.toLowerCase()) || pole.attachments.some((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    const status = filter === "all" || (filter === "complete" ? pole.status === "complete" : pole.status !== "complete");
    return match && status && (reviewFilter === "all" || (pole.reviewStage??"uploaded") === reviewFilter);
  }), [data, query, filter, reviewFilter]);

  const selected = useMemo(() => visiblePoles.find(pole=>pole.id===selectedId)??visiblePoles[0]??null,[visiblePoles,selectedId]);
  const selectedIndex=selected?visiblePoles.findIndex(p=>p.id===selected.id):-1;
  const [downloadNotice,setDownloadNotice]=useState("");

  async function refreshSurvey() { const payload=await fetchProject(projectId);setData(payload);setRevision(r=>r+1); }
  useEffect(()=>{
    if(!polesOpen)return;const previous=document.activeElement as HTMLElement|null;const sidebar=document.querySelector<HTMLElement>('.pole-sidebar');sidebar?.querySelector<HTMLButtonElement>('.viewer-list-close')?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setPolesOpen(false);if(event.key==='Tab'){const items=Array.from(sidebar?.querySelectorAll<HTMLElement>('button:not([disabled]),input,select,a[href]')??[]).filter(el=>el.getClientRects().length&&getComputedStyle(el).display!=='none');const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[polesOpen]);
  const selectPole = useCallback((pole: PoleRecord, nextView?: ViewName) => { setSelectedId(pole.id); setPolesOpen(false); setFocusAttachment(null); if (nextView) setView(nextView); }, []);
  const locateAttachment = useCallback((attachment: AttachmentRecord) => { setFocusAttachment(attachment); setView("split"); }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool || !data) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "select_project_pole",
      title: "Select pole",
      description: "Select a pole in the open project by its exact displayed pole name.",
      inputSchema: { type: "object", properties: { poleName: { type: "string" } }, required: ["poleName"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const poleName = String((input as { poleName?: unknown })?.poleName ?? "");
        const pole = data.poles.find((item) => item.poleName.toLowerCase() === poleName.toLowerCase());
        if (!pole) throw new Error("Pole name was not found in this project");
        selectPole(pole, "split"); return { selected: pole.poleName, attachments: pole.attachments.length };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [data, selectPole]);

  async function downloadPole(pole: PoleRecord) {
    if (!data) return; setError("");setDownloadNotice("");setExporting(`Preparing ${pole.poleName}`);
    try {
      const { strToU8, zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {
        [`${safeName(pole.poleName)}_data.json`]: strToU8(JSON.stringify({ project: data.project, pole }, null, 2)),
        [`${safeName(pole.poleName)}_attachments.csv`]: strToU8(poleCsv(pole)),
        [`${safeName(pole.poleName)}_report.html`]: strToU8(reportHtml(data.project, pole)),
      };
      let missingPhoto=false;
      if (pole.imageFilename) {
        const response = await authenticatedFetch(projectImageUrl(projectId, pole.id));
        if(response.ok)files[`original_photo/${sourceFilename(pole.imageFilename)}`]=new Uint8Array(await response.arrayBuffer());else missingPhoto=true;
      }
      if(missingPhoto)files['MISSING_PHOTO.txt']=strToU8(`The original photo ${pole.imageFilename} was unavailable. Upload it again through the project workspace. Survey records and measurements are included.`);
      downloadBlob(new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" }), `${safeName(pole.poleName)}_pole_package.zip`);
      setDownloadNotice(missingPhoto?'Pole package downloaded with records and measurements. Its original photo is missing; see MISSING_PHOTO.txt.':'Pole package downloaded.');
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create pole package"); }
    finally { setExporting(""); }
  }

  async function downloadAll() {
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

  if (!data) return <main className="viewer-loading"><LoaderCircle className="spin" /><p>{error || "Loading your project…"}</p><a href={projectsHref(user.role)}>Return to projects</a></main>;
  const views:{id:ViewName;label:string;icon:typeof MapIcon}[]=[{id:'map',label:'Satellite map',icon:MapIcon},{id:'split',label:'Photo + model',icon:SplitSquareVertical},{id:'photo',label:'Photo',icon:ImageIcon},{id:'profile',label:'SPIDA profile',icon:Layers3},{id:'files',label:'Project files',icon:FileArchive}];
  return <main className={`viewer-shell ${polesOpen ? "poles-open" : ""}`}>
    <header className="viewer-header">
      <button className="viewer-pole-toggle" aria-label={polesOpen ? "Close pole list" : "Open pole list"} aria-expanded={polesOpen} onClick={() => setPolesOpen(!polesOpen)}><Menu size={20}/></button>
      <a className="viewer-brand-link" href={projectsHref(user.role)} aria-label="Go to projects"><Brand/></a>
      <div className="viewer-project-title"><a href={projectsHref(user.role)}><ArrowLeft size={16}/> Projects</a><span/><div><small>{data.project.client_name}</small><h1>{data.project.name}</h1></div></div>
      <div className="viewer-actions"><ThemeControl/><button className="download-button" aria-label="Download all poles" onClick={() => void downloadAll()} disabled={Boolean(exporting)||!data.poles.length} title="Download survey records, reports and available photos">{exporting?<LoaderCircle className="spin"/>:<Download/>}<span>Download project</span></button><span className="viewer-account"><span className="viewer-user-avatar">{user.displayName.slice(0,1)}</span><span><strong>{user.displayName}</strong><small>{user.role==='staff'?'Internal team':user.role==='admin'?'Administrator':'Client'}</small></span></span>{onSignOut?<button className="icon-button" onClick={onSignOut} aria-label="Sign out"><LogOut/></button>:<a className="icon-button" href={signOutPath} aria-label="Sign out"><LogOut/></a>}</div>
    </header>
    {error&&<div className="viewer-error" role="alert">{error}<button aria-label="Dismiss project error" onClick={()=>setError('')}><X size={16}/></button></div>}
    {exporting&&<div className="viewer-export-status" role="status"><LoaderCircle size={16} className="spin"/>{exporting}</div>}
    {downloadNotice&&<div className="viewer-export-status" role="status">{downloadNotice}<button className="text-button" onClick={()=>setDownloadNotice('')}>Dismiss</button></div>}
    {polesOpen&&<button className="viewer-poles-backdrop" aria-label="Close pole list" onClick={()=>setPolesOpen(false)}/>}
    <div className="viewer-layout">
      <aside className="pole-sidebar" role={polesOpen?"dialog":undefined} aria-modal={polesOpen||undefined} aria-label="Survey records">
        <div className="pole-sidebar-heading"><div><small>PROJECT LIBRARY</small><h2>Survey records <span>{data.poles.length}</span></h2></div><button className="viewer-list-close icon-button" onClick={()=>setPolesOpen(false)} aria-label="Close pole list"><X size={18}/></button></div>
        <div className="pole-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search poles" placeholder="Find a pole or attachment"/>{query&&<button aria-label="Clear pole search" onClick={()=>setQuery('')}><X size={14}/></button>}</div>
        <div id="pole-filter-controls" hidden={!poleFiltersOpen}><div className="pole-filters">{(['all','complete','location'] as const).map(option=><button key={option} onClick={()=>setFilter(option)} aria-pressed={filter===option} className={filter===option?'active':''}>{option==='all'?'All poles':option==='complete'?'Complete':'Location only'}</button>)}</div><label className="review-filter"><span>Review stage</span><select aria-label="Filter by review stage" value={reviewFilter} onChange={e=>setReviewFilter(e.target.value as typeof reviewFilter)}><option value="all">All review stages</option>{reviewStages.map(stage=><option key={stage} value={stage}>{reviewLabels[stage]}</option>)}</select></label></div>
        <div className="pole-list">{visiblePoles.map((pole,index)=><button key={pole.id} aria-pressed={pole.id===selected?.id} className={pole.id===selected?.id?'selected':''} onClick={()=>selectPole(pole)}><span className="pole-index">{String(index+1).padStart(2,'0')}</span><span className="pole-list-copy"><strong>{pole.poleName}</strong><small>{pole.attachments.length} attachments <span>·</span> {reviewLabels[pole.reviewStage??'uploaded']}</small></span><ChevronRight size={15}/></button>)}{!visiblePoles.length&&<div className="pole-list-empty"><Search size={24}/><strong>No matching poles</strong><p>Try another ID or clear your filters.</p><button className="text-button" onClick={()=>{setQuery('');setFilter('all');setReviewFilter('all');}}>Clear filters</button></div>}</div>
        <footer><span>{visiblePoles.length} of {data.poles.length} poles</span><button aria-controls="pole-filter-controls" aria-expanded={poleFiltersOpen} onClick={()=>setPoleFiltersOpen(!poleFiltersOpen)}><ListFilter size={14}/>{poleFiltersOpen?'Hide filters':'Show filters'}</button></footer>
      </aside>
      <section className="viewer-main" aria-label="Project workspace">
        <div className="viewer-workspace-toolbar"><div className="viewer-mobile-context"><small>{data.project.client_name}</small><strong>{data.project.name}</strong></div><nav className="view-tabs" aria-label="Project views">{views.map(({id,label,icon:Icon})=><button key={id} className={view===id?'active':''} aria-pressed={view===id} onClick={()=>setView(id)}><Icon size={17}/>{label}</button>)}</nav>{data.canEdit&&<div className="viewer-project-tools"><a className="workspace-button secondary" href={`/portal?tab=import&project=${encodeURIComponent(projectId)}`}><CloudUpload size={16}/>Add data</a><button className="workspace-button primary" onClick={()=>setWorkflowOpen(true)}><ClipboardCheck size={16}/><span>Review &amp; client access</span></button><button className="workspace-button secondary viewer-history-button" aria-label="Show project history" onClick={()=>setHistoryOpen(true)}><History size={17}/></button></div>}</div>
        {view==='files'?<ProjectFilesPanel projectId={projectId}/>:<div className={`viewer-stage ${selected?'':'is-empty'}`}>
          <div className="viewer-canvas">
            {view==='map'&&<SatelliteMap poles={visiblePoles} selected={selected} onSelect={selectPole} project={data.project}/>}
            {selected&&view==='split'&&<div className="split-view"><PanelHeader eyebrow="ORIGINAL PHOTO" title={selected.poleName} trailing="Full resolution"/><PanelHeader eyebrow="MEASURED MODEL" title="Attachment profile" trailing={`TOP ${meters(selected.topHeightM)}`}/><PhotoZoom pole={selected} projectId={projectId} focusAttachment={focusAttachment} canEdit={data.canEdit}/><ModelZoom key={selected.id} pole={selected} focusAttachment={focusAttachment}/></div>}
            {selected&&view==='photo'&&<div className="single-view"><PanelHeader eyebrow="ORIGINAL PHOTO" title={selected.poleName} trailing={selected.imageFilename||'No photo uploaded'}/><PhotoZoom pole={selected} projectId={projectId} focusAttachment={focusAttachment} canEdit={data.canEdit}/></div>}
            {selected&&view==='profile'&&<div className="single-view"><PanelHeader eyebrow="MEASURED MODEL" title={`${selected.poleName} · attachment profile`} trailing={`TOP ${meters(selected.topHeightM)}`}/><ModelZoom key={selected.id} pole={selected} focusAttachment={focusAttachment}/></div>}
            {!selected&&view!=='map'&&<div className="viewer-empty"><Search size={28}/><h2>{data.poles.length?'No poles match your filters':'Your project is ready for data'}</h2><p>{data.poles.length?'Clear the search or change the filters to see your survey.':'Upload a location sheet, photos and measurements to get started.'}</p>{data.canEdit&&!data.poles.length&&<a className="workspace-button primary" href={`/portal?tab=import&project=${encodeURIComponent(projectId)}`}>Upload project data</a>}</div>}
          </div>
          {selected&&<aside className="pole-inspector" aria-label="Selected pole details"><header className="inspector-heading"><div><small>SELECTED POLE</small><h2>{selected.poleName}</h2></div><div className="inspector-navigation"><button aria-label="Previous pole" disabled={selectedIndex<=0} onClick={()=>selectPole(visiblePoles[selectedIndex-1])}><ChevronLeft size={18}/></button><button aria-label="Next pole" disabled={selectedIndex>=visiblePoles.length-1} onClick={()=>selectPole(visiblePoles[selectedIndex+1])}><ChevronRight size={18}/></button></div></header>
            <div className="inspector-subtitle"><span className={`review-badge stage-${selected.reviewStage??'uploaded'}`}>{reviewLabels[selected.reviewStage??'uploaded']}</span><span>{selectedIndex+1} of {visiblePoles.length} poles</span></div>
            {view==='map'&&<div className="inspector-photo"><PhotoZoom pole={selected} projectId={projectId} focusAttachment={null} canEdit={data.canEdit}/><button className="inspector-open-photo" onClick={()=>setView('photo')}><Maximize2 size={15}/>Open photo</button></div>}
            <button className="inspector-model-button" onClick={()=>setView('split')}><SplitSquareVertical size={17}/>Compare photo and model<ArrowRight size={16}/></button>
            <SurveyReview key={selected.id} compact pole={selected} admin={user.role==='admin'} canEdit={data.canEdit===true} onChanged={refreshSurvey}/>
            <PoleDataSection pole={selected} onLocate={locateAttachment} onDownload={()=>void downloadPole(selected)} projectId={projectId} downloading={Boolean(exporting)}/>
          </aside>}
        </div>}
      </section>
    </div>
    {workflowOpen&&<ProjectWorkflowDialog projectId={projectId} onClose={()=>setWorkflowOpen(false)} onChanged={refreshSurvey}/>}
    {historyOpen&&<WorkspaceDialog title="Project activity" onClose={()=>setHistoryOpen(false)}><ActivityLog projectId={projectId} revision={revision}/></WorkspaceDialog>}
  </main>;
}

function PanelHeader({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing: string }) { return <header className="panel-header"><p><small>{eyebrow}</small><strong>{title}</strong></p><span>{trailing}</span></header>; }


function PhotoZoom({ pole, projectId, focusAttachment, canEdit=false }: { pole: PoleRecord; projectId: string; focusAttachment: AttachmentRecord | null; canEdit?:boolean }) {
  const frame = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [imageSrc, setImageSrc] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [natural, setNatural] = useState({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 });
  const [size, setSize] = useState({ width: 700, height: 650 }); const [scale, setScale] = useState(0.2); const [pan, setPan] = useState({ x: 0, y: 0 }); const [loaded, setLoaded] = useState(false);
  const fitScale = Math.min(size.width / natural.width, size.height / natural.height) * 0.94;
  const fit = useCallback(() => { setScale(fitScale); setPan({ x: (size.width - natural.width * fitScale) / 2, y: (size.height - natural.height * fitScale) / 2 }); }, [fitScale, natural.height, natural.width, size.height, size.width]);
  useEffect(() => { const node = frame.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, []);
  useEffect(() => {
    if (!pole.imageFilename) return;
    let objectUrl = ""; let active = true;
    setLoaded(false); setImageSrc(""); setPhotoError("");
    void authenticatedFetch(projectImageUrl(projectId, pole.id)).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "The original photo is unavailable. Retry or ask your administrator to upload it.");
      }
      return response.blob();
    }).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob); setImageSrc(objectUrl);
    }).catch((err) => { if (active) setPhotoError(err instanceof Error ? err.message : "Could not load this photo. Please retry."); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [pole.id,pole.imageFilename,pole.updatedAt,projectId,photoAttempt]);
  useEffect(() => { setLoaded(false); setNatural({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 }); }, [pole.id, pole.imageHeight, pole.imageWidth]);
  useEffect(() => { fit(); }, [fit]);
  useEffect(() => { if (!focusAttachment || focusAttachment.photoX == null || focusAttachment.photoY == null) return; const next = Math.max(fitScale * 2.6, 0.75); setScale(next); setPan({ x: size.width / 2 - focusAttachment.photoX * next, y: size.height / 2 - focusAttachment.photoY * next }); }, [focusAttachment, fitScale, size.height, size.width]);
  const zoom = (factor: number) => { const next = clamp(scale * factor, fitScale * 0.75, 8); setPan((value) => ({ x: size.width / 2 - (size.width / 2 - value.x) * (next / scale), y: size.height / 2 - (size.height / 2 - value.y) * (next / scale) })); setScale(next); };
  if (!pole.imageFilename) return <div className="no-photo"><ImageIcon /><h3>No original image uploaded</h3><p>The location and pole information remain available. The matching original can be added through Upload data.</p>{canEdit&&<a className="workspace-button secondary" href={`/portal?tab=import&project=${encodeURIComponent(projectId)}`}>Upload matching photos</a>}</div>;
  return <div ref={frame} className="photo-zoom" onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.18 : 0.85); }} onPointerDown={(event) => { if (event.button !== 0 || (event.target as Element).closest("button,a,input,select,textarea")) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y }); }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    {!loaded && !photoError && <div className="image-loading"><LoaderCircle className="spin" /> Loading original pixels…</div>}
    {photoError && <div className="photo-load-error" role="alert"><ImageIcon size={28}/><h3>Original photo unavailable</h3><p>{photoError}</p><button className="workspace-button secondary" onPointerDown={event => event.stopPropagation()} onClick={() => setPhotoAttempt(value => value + 1)}>Retry photo</button>{canEdit&&<a className="text-button" href={`/portal?tab=import&project=${encodeURIComponent(projectId)}`}>Upload matching photos</a>}</div>}
    <div className="photo-stage" style={{ width: natural.width, height: natural.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}><img src={imageSrc || undefined} alt={`${pole.poleName} full-resolution measured pole`} draggable={false} onError={() => { if (imageSrc) setPhotoError("This photo could not be displayed. Retry or upload a supported image."); }} onLoad={(event) => { const image = event.currentTarget; setNatural({ width: image.naturalWidth, height: image.naturalHeight }); setLoaded(true); setPhotoError(""); }} /><PhotoOverlay pole={pole} /></div>
    {loaded&&!photoError&&<><div className="zoom-toolbar"><button onClick={() => zoom(0.8)} aria-label="Zoom out"><Minus /></button><strong>{Math.round(scale * 100)}%</strong><button onClick={() => zoom(1.25)} aria-label="Zoom in"><Plus /></button><button onClick={() => { setScale(1); setPan({ x: size.width / 2 - natural.width / 2, y: size.height / 2 - natural.height / 2 }); }}>100%</button><button onClick={fit}><Focus /> Fit</button></div><span className="fullres-badge"><Maximize2 /> {natural.width} × {natural.height} original</span><span className="drag-hint">Scroll to zoom · drag to move</span></>}
  </div>;
}

function PhotoOverlay({ pole }: { pole: PoleRecord }) {
  const width = pole.imageWidth || 3024, height = pole.imageHeight || 4032;
  const labels = pole.attachments.filter((item) => item.photoX != null && item.photoY != null);
  return <svg className="photo-overlay" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Measured attachment height overlay">{pole.baseX != null && pole.baseY != null && pole.topX != null && pole.topY != null && <><line x1={pole.baseX} y1={pole.baseY} x2={pole.topX} y2={pole.topY} stroke="#ffbb45" strokeWidth="10" strokeDasharray="26 18" /><circle cx={pole.baseX} cy={pole.baseY} r="20" fill="#ffdf78" stroke="#071522" strokeWidth="7" /><circle cx={pole.topX} cy={pole.topY} r="20" fill="#ff8250" stroke="#071522" strokeWidth="7" /></>}{labels.map((item) => { const style = attachmentStyle(item.name); const x = Number(item.photoX), y = Number(item.photoY); const left = item.side === "left"; const lineX = left ? x - 310 : x + 310; return <g key={item.id}><polyline points={`${x},${y} ${lineX},${y}`} stroke={style.color} strokeWidth="9" /><circle cx={x} cy={y} r="19" fill={style.color} stroke="#071522" strokeWidth="7" /><rect x={left ? lineX - 390 : lineX + 8} y={y - 34} width="382" height="58" rx="9" fill="#071522" fillOpacity=".88" /><text x={left ? lineX - 18 : lineX + 25} y={y + 7} textAnchor={left ? "end" : "start"} fill="white" fontSize="29" fontWeight="700">{item.name} • {item.heightM.toFixed(3)} m</text></g>; })}</svg>;
}

function ModelZoom({ pole, focusAttachment }: { pole: PoleRecord; focusAttachment: AttachmentRecord | null }) {
  const [zoom, setZoom] = useState(1); const [pan, setPan] = useState({ x: 0, y: 0 }); const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => { if (!focusAttachment) return; setZoom(1.75); setPan({ x: 0, y: (focusAttachment.heightM - (pole.topHeightM || 10) / 2) * 22 }); }, [focusAttachment, pole.topHeightM]);
  const change = (factor: number) => setZoom((value) => clamp(value * factor, 0.8, 4));
  return <div className="model-zoom" onWheel={(event) => { event.preventDefault(); change(event.deltaY < 0 ? 1.16 : 0.86); }} onPointerDown={(event) => { if (event.button !== 0 || (event.target as Element).closest("button,a,input,select,textarea")) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current || zoom <= 1) return; setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y }); }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}><div className="model-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><SpidaModel pole={pole} focusAttachment={focusAttachment} /></div><div className="zoom-toolbar"><button aria-label="Zoom model out" onClick={() => change(0.8)}><Minus /></button><strong>{Math.round(zoom * 100)}%</strong><button aria-label="Zoom model in" onClick={() => change(1.25)}><Plus /></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Focus /> Fit</button></div><span className="drag-hint">Scroll to zoom • drag to move</span></div>;
}

function SpidaModel({ pole, focusAttachment }: { pole: PoleRecord; focusAttachment: AttachmentRecord | null }) {
  const width = 900, height = 780, groundY = 704, topY = 62, poleX = 430;
  const maximum = Math.max(1, pole.topHeightM || 0, ...pole.attachments.map((item) => item.heightM)) * 1.08;
  const yFor = (value: number) => groundY - (value / maximum) * (groundY - topY);
  const sorted = [...pole.attachments].sort((a, b) => b.heightM - a.heightM);
  const placed: number[] = [];
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`SPIDA-style model of ${pole.poleName} with exact measured attachments`}>
    <defs><linearGradient id={`pole-${pole.id}`} x1="0" x2="1"><stop stopColor="#754124"/><stop offset=".42" stopColor="#d18a50"/><stop offset=".72" stopColor="#9b5931"/><stop offset="1" stopColor="#5d321e"/></linearGradient><pattern id={`grid-${pole.id}`} width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="var(--model-grid)" strokeWidth="1"/></pattern></defs>
    <rect width={width} height={height} fill="var(--model-bg)"/><rect width={width} height={height} fill={`url(#grid-${pole.id})`} opacity=".7"/>
    {Array.from({ length: Math.floor(maximum) + 1 }, (_, value) => <g key={value}><line x1="112" x2="790" y1={yFor(value)} y2={yFor(value)} stroke="var(--model-grid)" strokeWidth="1"/><text x="98" y={yFor(value) + 4} textAnchor="end" fill="var(--workspace-muted)" fontSize="12">{value}</text><line x1="103" x2="112" y1={yFor(value)} y2={yFor(value)} stroke="#7190a8"/></g>)}
    <line x1="110" y1={groundY} x2="790" y2={groundY} stroke="#9cb84f" strokeWidth="4"/>{Array.from({ length: 22 }, (_, index) => <line key={index} x1={112 + index * 31} y1={groundY} x2={101 + index * 31} y2={groundY + 14} stroke="#6b8f43" strokeWidth="2"/>)}
    <polygon points={`${poleX - 25},${groundY + 15} ${poleX + 25},${groundY + 15} ${poleX + 11},${yFor(pole.topHeightM || maximum)} ${poleX - 10},${yFor(pole.topHeightM || maximum)}`} fill={`url(#pole-${pole.id})`} stroke="#e0a06d" strokeWidth="2"/>
    <ellipse cx={poleX} cy={yFor(pole.topHeightM || maximum)} rx="12" ry="6" fill="#c78859" stroke="#071522" strokeWidth="3"/>
    <text x="48" y="390" transform="rotate(-90 48 390)" fill="var(--workspace-muted)" fontSize="12" letterSpacing="2">HEIGHT ABOVE GROUND (m)</text>
    {sorted.map((item) => {
      const y = yFor(item.heightM), style = attachmentStyle(item.name), side = item.side === "left" ? -1 : 1;
      let labelY = y; while (placed.some((value) => Math.abs(value - labelY) < 28)) labelY += 30; placed.push(labelY);
      const active = focusAttachment?.id === item.id; const labelX = side < 0 ? 302 : 556;
      return <g key={item.id} opacity={focusAttachment && !active ? .48 : 1}>
        <Hardware kind={style.kind} x={poleX} y={y} side={side} color={style.color} />
        {labelY !== y && <line x1={poleX + side * 86} y1={y} x2={labelX - side * 18} y2={labelY} stroke={style.color} strokeWidth="1.5" strokeDasharray="4 4"/>}
        <circle cx={labelX} cy={labelY} r={active ? 7 : 4} fill={style.color}/><text x={labelX + side * 13} y={labelY + 4} textAnchor={side < 0 ? "end" : "start"} fill="var(--workspace-text)" fontWeight="700" fontSize="13">{item.name}</text><text x={labelX + side * 13} y={labelY + 20} textAnchor={side < 0 ? "end" : "start"} fill={style.color} fontWeight="700" fontSize="12">{item.heightM.toFixed(3)} m</text>
      </g>;
    })}
    <text x={poleX} y="746" textAnchor="middle" fill="var(--dashboard-accent)" fontWeight="700" fontSize="13" letterSpacing="1">{pole.poleName}</text><text x="786" y="728" textAnchor="end" fill="var(--workspace-muted)" fontSize="12">GROUND {pole.elevationM.toFixed(2)} m AMSL</text><text x="150" y={yFor(pole.topHeightM || maximum) - 10} fill="var(--workspace-text)" fontWeight="700" fontSize="12">TOP {meters(pole.topHeightM)}</text><line x1="230" y1={yFor(pole.topHeightM || maximum) - 14} x2={poleX - 12} y2={yFor(pole.topHeightM || maximum) - 14} stroke="#ff9859" strokeWidth="2" strokeDasharray="6 5"/>
  </svg>;
}

function Hardware({ kind, x, y, side, color }: { kind: string; x: number; y: number; side: number; color: string }) {
  if (kind === "guy") return <><line x1={x} y1={y} x2={x + side * 190} y2="704" stroke={color} strokeWidth="4"/><circle cx={x + side * 190} cy="704" r="8" fill={color}/></>;
  if (kind === "transformer") return <><line x1={x} y1={y} x2={x + side * 45} y2={y} stroke={color} strokeWidth="5"/><rect x={side < 0 ? x - 92 : x + 45} y={y - 33} width="47" height="66" rx="18" fill="#8f5a96" stroke={color} strokeWidth="3"/><line x1={x + side * 69} y1={y - 40} x2={x + side * 69} y2={y - 30} stroke={color} strokeWidth="5"/></>;
  if (kind === "equipment") return <><line x1={x} y1={y} x2={x + side * 48} y2={y} stroke={color} strokeWidth="4"/><rect x={side < 0 ? x - 83 : x + 47} y={y - 19} width="36" height="38" rx="4" fill="#173c3e" stroke={color} strokeWidth="3"/></>;
  if (kind === "insulator") return <><line x1={x} y1={y} x2={x + side * 100} y2={y} stroke={color} strokeWidth="4"/>{[35, 50, 65, 80].map((offset) => <ellipse key={offset} cx={x + side * offset} cy={y} rx="5" ry="10" fill="#715b88" stroke={color} strokeWidth="2"/>)}</>;
  const span = kind === "primary" ? 122 : kind === "communication" ? 96 : 108;
  return <><line x1={x - span} y1={y} x2={x + span} y2={y} stroke={color} strokeWidth={kind === "primary" ? 5 : 4}/><circle cx={x} cy={y} r="8" fill={color} stroke="#071522" strokeWidth="4"/><circle cx={x - span} cy={y} r="5" fill={color}/><circle cx={x + span} cy={y} r="5" fill={color}/>{kind === "primary" && <><ellipse cx={x - 62} cy={y} rx="7" ry="12" fill="#71452f" stroke={color} strokeWidth="2"/><ellipse cx={x + 62} cy={y} rx="7" ry="12" fill="#71452f" stroke={color} strokeWidth="2"/></>}</>;
}

function PoleDataSection({ pole, onLocate, onDownload, projectId, downloading }: { pole: PoleRecord; onLocate: (attachment: AttachmentRecord) => void; onDownload: () => void; projectId: string; downloading:boolean }) {
  return <section className="pole-data-grid"><article className="location-card"><div className="section-heading"><h3>Location &amp; dimensions</h3></div><dl className="location-values"><div><dt>Latitude</dt><dd>{pole.latitude.toFixed(6)}</dd></div><div><dt>Longitude</dt><dd>{pole.longitude.toFixed(6)}</dd></div><div><dt>Ground elevation</dt><dd>{meters(pole.elevationM)}</dd></div><div><dt>Pole top</dt><dd>{meters(pole.topHeightM)}</dd></div><div><dt>Pole height</dt><dd>{pole.poleHeightFt==null?'—':`${pole.poleHeightFt} ft`}</dd></div><div><dt>Class</dt><dd>{pole.poleClass??'—'}</dd></div></dl><a href={`https://www.google.com/maps/@?api=1&map_action=map&center=${pole.latitude},${pole.longitude}&zoom=20&basemap=satellite`} target="_blank" rel="noreferrer">Open in Google Maps<ExternalLink size={14}/></a></article>
    <article className="schedule-card"><div className="section-heading schedule-heading"><h3>Attachment heights</h3><span className="subtle-badge">{pole.attachments.length}</span></div><p className="inspector-attachment-hint">Select an attachment to locate it in the photo and model.</p><div className="inspector-attachments">{pole.attachments.length?pole.attachments.map(item=>{const style=attachmentStyle(item.name);return <button key={item.id} onClick={()=>onLocate(item)} aria-label={`Locate ${item.name}, ${item.heightM.toFixed(3)} metres`}><i style={{background:style.color}}/><span><strong>{item.name}</strong><small>{style.label} · {item.side}</small></span><b>{item.heightM.toFixed(3)} <small>m</small></b><LocateFixed size={15}/></button>;}):<p className="schedule-empty">No measured attachments yet.</p>}</div></article>
    <div className="inspector-downloads"><button className="workspace-button secondary" disabled={downloading} onClick={onDownload}><Download size={16}/>Download pole</button><a className="workspace-button secondary" href={`/projects/${encodeURIComponent(projectId)}/poles/${encodeURIComponent(pole.id)}/report`} target="_blank" rel="noreferrer"><Ruler size={16}/>Print / PDF</a></div></section>;
}


function SatelliteMap({ poles, selected, onSelect, project }: { poles: PoleRecord[]; selected: PoleRecord | null; onSelect: (pole: PoleRecord) => void; project: ProjectInfo }) {
  const frame = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 1100, height: 700 }); const [zoom, setZoom] = useState(16); const [center, setCenter] = useState({ lon: poles[0]?.longitude ?? 0, lat: poles[0]?.latitude ?? 0 });
  useEffect(() => { const node = frame.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, []);
  const fit=useCallback(()=>{const next=fitSurveyViewport(poles,size.width,size.height);setZoom(next.zoom);setCenter(next.center);},[poles,size.width,size.height]);
  const previousSelection=useRef(selected?.id);
  const [imageryFailed,setImageryFailed]=useState(false),[imageryAttempt,setImageryAttempt]=useState(0);
  useEffect(()=>{if(previousSelection.current===selected?.id)return;previousSelection.current=selected?.id;if(selected){setCenter({lon:selected.longitude,lat:selected.latitude});setZoom(value=>Math.max(value,17));}},[selected]);
  useEffect(() => { fit(); }, [fit]);
  const centerWorld = worldPoint(center.lon, center.lat, zoom); const left = centerWorld.x - size.width / 2, top = centerWorld.y - size.height / 2; const tiles: { key: string; x: number; y: number; urlX: number }[] = []; const count = 2 ** zoom;
  for (let ty = Math.floor(top / 256); ty <= Math.floor((top + size.height) / 256); ty += 1) for (let tx = Math.floor(left / 256); tx <= Math.floor((left + size.width) / 256); tx += 1) if (ty >= 0 && ty < count) tiles.push({ key: `${tx}-${ty}`, x: tx, y: ty, urlX: ((tx % count) + count) % count });
  const changeZoom = (next: number) => setZoom(clamp(next, 2, 20));
  return <section className="map-panel"><header className="map-heading"><p><small>SATELLITE MAP</small><strong>{project.location_label || "Pole locations"}</strong></p><span>Drag to pan • Scroll to zoom • Click a named pole</span></header><div ref={frame} className="slippy-map" tabIndex={0} role="region" aria-label="Satellite project map" data-map-zoom={zoom} data-map-center={`${center.lon},${center.lat}`} onKeyDown={event=>{const shifts:Record<string,[number,number]>={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]};if(shifts[event.key]){event.preventDefault();const [x,y]=shifts[event.key];setCenter(pointToLonLat(centerWorld.x+x,centerWorld.y+y,zoom));}else if(event.key==='+'||event.key==='='){event.preventDefault();changeZoom(zoom+1);}else if(event.key==='-'){event.preventDefault();changeZoom(zoom-1);}}} onWheel={(event) => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? 1 : -1)); }} onPointerDown={(event) => { if (event.button !== 0 || (event.target as HTMLElement).closest("button,a")) return; drag.current = { x: event.clientX, y: event.clientY, centerX: centerWorld.x, centerY: centerWorld.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; const world = { x: drag.current.centerX - (event.clientX - drag.current.x), y: drag.current.centerY - (event.clientY - drag.current.y) }; setCenter(pointToLonLat(world.x, world.y, zoom)); }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    <div className="map-tiles">{tiles.map((tile) => <img key={`${tile.key}-${imageryAttempt}`} onError={event=>{event.currentTarget.setAttribute("aria-hidden","true");setImageryFailed(true);}} src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.urlX}`} alt="" draggable={false} style={{ left: tile.x * 256 - left, top: tile.y * 256 - top }} />)}</div>
    <span className="imagery-badge"><i /> SATELLITE IMAGERY</span><div className="map-controls"><button aria-label="Zoom map in" onClick={() => changeZoom(zoom + 1)}><Plus /></button><button aria-label="Zoom map out" onClick={() => changeZoom(zoom - 1)}><Minus /></button><button aria-label="Fit map to poles" onClick={fit}><Crosshair /></button></div>
    {poles.map((pole) => { const point = worldPoint(pole.longitude, pole.latitude, zoom); return <button key={pole.id} className={`map-pole-marker ${pole.status==="complete"?"complete":"location"} ${selected?.id === pole.id ? "selected" : ""}`} aria-label={`Select pole ${pole.poleName}`} style={{left:mapPixelX(pole.longitude,center.lon,zoom,size.width),top:point.y-top}} onClick={() => onSelect(pole)}><i />{(zoom>=17||selected?.id===pole.id)&&<span>{pole.poleName}</span>}</button>; })}
    <div className="map-legend"><span><i className="complete"/>Survey complete</span><span><i className="location"/>Location only</span></div><a className="map-attribution" href="https://www.esri.com/en-us/legal/terms/data-attributions" target="_blank" rel="noreferrer">Imagery © Esri, Maxar &amp; contributors</a>
    {imageryFailed&&poles.length>0&&<div className="map-load-notice" role="status">Satellite imagery could not load. Pole locations remain available.<button onClick={()=>{setImageryFailed(false);setImageryAttempt(n=>n+1);}}>Retry imagery</button></div>}
    {!poles.length&&<div className="map-empty-state"><MapIcon size={28}/><strong>No survey locations to display</strong><p>Upload pole locations or clear your filters.</p></div>}

  </div></section>;
}

