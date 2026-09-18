"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AttachmentRecord, PoleRecord, PortalUser } from "@/lib/portal-types";
import {
  ArrowLeft, CircleUserRound, Crosshair, Download, ExternalLink,
  FileArchive, Focus, Image as ImageIcon, Layers3, ListFilter, LoaderCircle, LocateFixed,
  LogOut, Map as MapIcon, Maximize2, Minus, Plus, Ruler, Search, SplitSquareVertical,
} from "lucide-react";

type ProjectInfo = { id: string; name: string; code: string; description: string; location_label: string; status: string; client_id: string; client_name: string; client_code: string };
type ProjectPayload = { project: ProjectInfo; poles: PoleRecord[] };
type ViewName = "map" | "split" | "photo" | "profile";

function Brand() { return <div className="brand-lockup compact"><span className="brand-mark" aria-hidden="true"><span /></span><span><strong>POWERTEK</strong><small>POLE INTELLIGENCE</small></span></div>; }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const meters = (value: number | null | undefined, digits = 2) => value == null ? "—" : `${Number(value).toFixed(digits)} m`;
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
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/poles`);
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
  const rows = pole.attachments.map((item) => `<tr><td>${item.name}</td><td>${item.heightM.toFixed(3)} m</td><td>${item.side}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${pole.poleName} report</title><style>body{font:14px Arial;color:#15212c;margin:40px}header{border-bottom:4px solid #f47d35;padding-bottom:14px}h1{margin:8px 0}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.meta div{border:1px solid #ccd5db;padding:12px}.meta small{display:block;color:#647583;margin-bottom:5px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #c8d1d8;padding:9px;text-align:left}th{background:#edf2f5}footer{margin-top:30px;color:#6c7d89;font-size:11px}@media print{body{margin:18mm}}</style></head><body><header><b>POWERTEK • POLE INTELLIGENCE</b><h1>${pole.poleName}</h1><span>${project.client_name} / ${project.name}</span></header><section class="meta"><div><small>LATITUDE</small><b>${pole.latitude}</b></div><div><small>LONGITUDE</small><b>${pole.longitude}</b></div><div><small>GROUND ELEVATION</small><b>${pole.elevationM.toFixed(2)} m</b></div><div><small>POLE TOP</small><b>${meters(pole.topHeightM)}</b></div><div><small>POLE HEIGHT</small><b>${pole.poleHeightFt ?? "—"} ft</b></div><div><small>POLE CLASS</small><b>${pole.poleClass ?? "—"}</b></div></section><h2>Attachment schedule</h2><table><thead><tr><th>Attachment</th><th>Height above ground</th><th>Photo side</th></tr></thead><tbody>${rows || `<tr><td colspan="3">No measured attachments</td></tr>`}</tbody></table><footer>Generated from Powertek Pole Portal • ${new Date().toISOString()}</footer></body></html>`;
}

export function ProjectViewer({ projectId, user, signOutPath }: { projectId: string; user: PortalUser; signOutPath: string }) {
  const [data, setData] = useState<ProjectPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [view, setView] = useState<ViewName>("map");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "complete" | "location">("all");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");
  const [focusAttachment, setFocusAttachment] = useState<AttachmentRecord | null>(null);

  useEffect(() => { void fetchProject(projectId).then((payload) => { setData(payload); setSelectedId(payload.poles[0]?.id ?? ""); }).catch((err) => setError(err instanceof Error ? err.message : "Could not load project")); }, [projectId]);
  const selected = useMemo(() => data?.poles.find((pole) => pole.id === selectedId) ?? data?.poles[0] ?? null, [data, selectedId]);
  const visiblePoles = useMemo(() => (data?.poles ?? []).filter((pole) => {
    const match = !query.trim() || pole.poleName.toLowerCase().includes(query.toLowerCase()) || pole.attachments.some((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    const status = filter === "all" || (filter === "complete" ? pole.status === "complete" : pole.status !== "complete");
    return match && status;
  }), [data, query, filter]);

  const selectPole = useCallback((pole: PoleRecord, nextView?: ViewName) => { setSelectedId(pole.id); setFocusAttachment(null); if (nextView) setView(nextView); }, []);
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
    if (!data) return; setExporting(`Preparing ${pole.poleName}`);
    try {
      const { strToU8, zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {
        [`${safeName(pole.poleName)}_data.json`]: strToU8(JSON.stringify({ project: data.project, pole }, null, 2)),
        [`${safeName(pole.poleName)}_attachments.csv`]: strToU8(poleCsv(pole)),
        [`${safeName(pole.poleName)}_report.html`]: strToU8(reportHtml(data.project, pole)),
      };
      if (pole.imageFilename) {
        const response = await fetch(`/api/projects/${projectId}/poles/${pole.id}/image`);
        if (response.ok) files[`original_photo/${safeName(pole.imageFilename)}`] = new Uint8Array(await response.arrayBuffer());
      }
      downloadBlob(new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" }), `${safeName(pole.poleName)}_pole_package.zip`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create pole package"); }
    finally { setExporting(""); }
  }

  async function downloadAll() {
    if (!data?.poles.length) return; setExporting("Preparing complete project package");
    try {
      const { strToU8, zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      const combined = data.poles.flatMap((pole) => poleCsv(pole).split(/\r?\n/).slice(1));
      files[`${safeName(data.project.code)}_all_poles.csv`] = strToU8(`"Pole ID","Latitude","Longitude","Ground elevation (m)","Pole top (m)","Pole height (ft)","Pole class","Attachment","Attachment height (m)","Photo side"\r\n${combined.join("\r\n")}`);
      files[`${safeName(data.project.code)}_all_poles.json`] = strToU8(JSON.stringify({ project: data.project, poles: data.poles }, null, 2));
      for (let index = 0; index < data.poles.length; index += 1) {
        const pole = data.poles[index];
        setExporting(`Collecting original photo ${index + 1} of ${data.poles.length}`);
        files[`reports/${safeName(pole.poleName)}.html`] = strToU8(reportHtml(data.project, pole));
        if (!pole.imageFilename) continue;
        const response = await fetch(`/api/projects/${projectId}/poles/${pole.id}/image`);
        if (response.ok) files[`original_photos/${safeName(pole.imageFilename)}`] = new Uint8Array(await response.arrayBuffer());
      }
      setExporting("Compressing project package");
      downloadBlob(new Blob([zipSync(files, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" }), `${safeName(data.project.code)}_all_poles.zip`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create project package"); }
    finally { setExporting(""); }
  }

  if (!data) return <main className="viewer-loading"><LoaderCircle className="spin" /><p>{error || "Loading secure pole workspace…"}</p><Link href="/">Return to projects</Link></main>;
  return <main className="viewer-shell">
    <header className="viewer-header"><Brand /><div className="viewer-project-title"><Link href="/"><ArrowLeft /> Projects</Link><span /><p><small>{data.project.client_name}</small><strong>{data.project.name}</strong></p></div><div className="viewer-actions"><button className="download-button" onClick={() => void downloadAll()} disabled={Boolean(exporting)}>{exporting ? <LoaderCircle className="spin" /> : <FileArchive />}<span>{exporting || "Download all poles"}</span></button><span className="viewer-account"><CircleUserRound /><span><strong>{user.displayName}</strong><small>{user.role}</small></span></span><a className="icon-button" href={signOutPath} target="_top"><LogOut /></a></div></header>
    {error && <div className="viewer-error">{error}<button onClick={() => setError("")}>×</button></div>}
    <div className="viewer-layout">
      <aside className="pole-sidebar"><div className="pole-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pole ID or attachment" /></div><div className="pole-filters"><button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>All</button><button onClick={() => setFilter("complete")} className={filter === "complete" ? "active" : ""}>Complete</button><button onClick={() => setFilter("location")} className={filter === "location" ? "active" : ""}>Location only</button></div><div className="pole-list scrollbar-thin">{visiblePoles.map((pole, index) => <button key={pole.id} className={pole.id === selected?.id ? "selected" : ""} onClick={() => selectPole(pole)}><span className="pole-index">{String(index + 1).padStart(2, "0")}</span><p><strong>{pole.poleName}</strong><small>{pole.attachments.length} attachments • top {meters(pole.topHeightM)}</small></p><i className={pole.status === "complete" ? "complete" : "location"} /></button>)}</div><footer><span>{visiblePoles.length} records shown</span><button><ListFilter /> Filter</button></footer></aside>
      <section className="viewer-main"><nav className="view-tabs"><button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><MapIcon /> Satellite map</button><button className={view === "split" ? "active" : ""} onClick={() => setView("split")}><SplitSquareVertical /> Photo + model</button><button className={view === "photo" ? "active" : ""} onClick={() => setView("photo")}><ImageIcon /> Photo</button><button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}><Layers3 /> SPIDA profile</button><span className="view-quality"><i /> Original-quality zoom</span></nav>
        {view === "map" && <SatelliteMap poles={data.poles} selected={selected} onSelect={selectPole} onOpen={(pole) => selectPole(pole, "split")} project={data.project} />}
        {selected && view === "split" && <div className="split-view"><PanelHeader eyebrow="FIELD IMAGE" title="Measured pole" trailing={selected.imageFilename || "No image"} /><PanelHeader eyebrow="ENGINEERING PROFILE" title="SPIDA-style measured model" trailing={`TOP ${meters(selected.topHeightM)}`} /><PhotoZoom pole={selected} projectId={projectId} focusAttachment={focusAttachment} /><ModelZoom pole={selected} focusAttachment={focusAttachment} /></div>}
        {selected && view === "photo" && <div className="single-view"><PanelHeader eyebrow="FIELD IMAGE" title={`${selected.poleName} • original photo`} trailing={selected.imageFilename || "No image"} /><PhotoZoom pole={selected} projectId={projectId} focusAttachment={focusAttachment} /></div>}
        {selected && view === "profile" && <div className="single-view"><PanelHeader eyebrow="ENGINEERING PROFILE" title={`${selected.poleName} • SPIDA-style elevation`} trailing={`TOP ${meters(selected.topHeightM)}`} /><ModelZoom pole={selected} focusAttachment={focusAttachment} /></div>}
        {selected && view !== "map" && <PoleDataSection pole={selected} onLocate={locateAttachment} onDownload={() => void downloadPole(selected)} projectId={projectId} />}
      </section>
    </div>
  </main>;
}

function PanelHeader({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing: string }) { return <header className="panel-header"><p><small>{eyebrow}</small><strong>{title}</strong></p><span>{trailing}</span></header>; }

function projectImageUrl(projectId: string, pole: PoleRecord) { return `/api/projects/${encodeURIComponent(projectId)}/poles/${encodeURIComponent(pole.id)}/image`; }

function PhotoZoom({ pole, projectId, focusAttachment }: { pole: PoleRecord; projectId: string; focusAttachment: AttachmentRecord | null }) {
  const frame = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [natural, setNatural] = useState({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 });
  const [size, setSize] = useState({ width: 700, height: 650 }); const [scale, setScale] = useState(0.2); const [pan, setPan] = useState({ x: 0, y: 0 }); const [loaded, setLoaded] = useState(false);
  const fitScale = Math.min(size.width / natural.width, size.height / natural.height) * 0.94;
  const fit = useCallback(() => { setScale(fitScale); setPan({ x: (size.width - natural.width * fitScale) / 2, y: (size.height - natural.height * fitScale) / 2 }); }, [fitScale, natural.height, natural.width, size.height, size.width]);
  useEffect(() => { const node = frame.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, []);
  useEffect(() => { setLoaded(false); setNatural({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 }); }, [pole.id, pole.imageHeight, pole.imageWidth]);
  useEffect(() => { fit(); }, [fit]);
  useEffect(() => { if (!focusAttachment || focusAttachment.photoX == null || focusAttachment.photoY == null) return; const next = Math.max(fitScale * 2.6, 0.75); setScale(next); setPan({ x: size.width / 2 - focusAttachment.photoX * next, y: size.height / 2 - focusAttachment.photoY * next }); }, [focusAttachment, fitScale, size.height, size.width]);
  const zoom = (factor: number) => { const next = clamp(scale * factor, fitScale * 0.75, 8); setPan((value) => ({ x: size.width / 2 - (size.width / 2 - value.x) * (next / scale), y: size.height / 2 - (size.height / 2 - value.y) * (next / scale) })); setScale(next); };
  if (!pole.imageFilename) return <div className="no-photo"><ImageIcon /><h3>No original image uploaded</h3><p>The location and pole information remain available. An administrator can add the matching full-quality photo from Upload data.</p></div>;
  return <div ref={frame} className="photo-zoom" onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.18 : 0.85); }} onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y }); }} onPointerUp={() => { drag.current = null; }}>
    {!loaded && <div className="image-loading"><LoaderCircle className="spin" /> Loading original pixels…</div>}
    <div className="photo-stage" style={{ width: natural.width, height: natural.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}><img src={projectImageUrl(projectId, pole)} alt={`${pole.poleName} full-resolution measured pole`} draggable={false} onLoad={(event) => { const image = event.currentTarget; setNatural({ width: image.naturalWidth, height: image.naturalHeight }); setLoaded(true); }} /><PhotoOverlay pole={pole} /></div>
    <div className="zoom-toolbar"><button onClick={() => zoom(0.8)} aria-label="Zoom out"><Minus /></button><strong>{Math.round(scale * 100)}%</strong><button onClick={() => zoom(1.25)} aria-label="Zoom in"><Plus /></button><button onClick={() => { setScale(1); setPan({ x: size.width / 2 - natural.width / 2, y: size.height / 2 - natural.height / 2 }); }}>100%</button><button onClick={fit}><Focus /> Fit</button></div><span className="fullres-badge"><Maximize2 /> {natural.width} × {natural.height} original</span><span className="drag-hint">Scroll to zoom • drag to move</span>
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
  return <div className="model-zoom" onWheel={(event) => { event.preventDefault(); change(event.deltaY < 0 ? 1.16 : 0.86); }} onPointerDown={(event) => { if (event.button !== 0) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current || zoom <= 1) return; setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y }); }} onPointerUp={() => { drag.current = null; }}><div className="model-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><SpidaModel pole={pole} focusAttachment={focusAttachment} /></div><div className="zoom-toolbar"><button onClick={() => change(0.8)}><Minus /></button><strong>{Math.round(zoom * 100)}%</strong><button onClick={() => change(1.25)}><Plus /></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Focus /> Fit</button></div><span className="drag-hint">Scroll to zoom • drag to move</span></div>;
}

function SpidaModel({ pole, focusAttachment }: { pole: PoleRecord; focusAttachment: AttachmentRecord | null }) {
  const width = 900, height = 780, groundY = 704, topY = 62, poleX = 430;
  const maximum = Math.max(1, pole.topHeightM || 0, ...pole.attachments.map((item) => item.heightM)) * 1.08;
  const yFor = (value: number) => groundY - (value / maximum) * (groundY - topY);
  const sorted = [...pole.attachments].sort((a, b) => b.heightM - a.heightM);
  const placed: number[] = [];
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`SPIDA-style model of ${pole.poleName} with exact measured attachments`}>
    <defs><linearGradient id={`pole-${pole.id}`} x1="0" x2="1"><stop stopColor="#754124"/><stop offset=".42" stopColor="#d18a50"/><stop offset=".72" stopColor="#9b5931"/><stop offset="1" stopColor="#5d321e"/></linearGradient><pattern id={`grid-${pole.id}`} width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0V42" fill="none" stroke="#173147" strokeWidth="1"/></pattern></defs>
    <rect width={width} height={height} fill="#071522"/><rect width={width} height={height} fill={`url(#grid-${pole.id})`} opacity=".7"/>
    {Array.from({ length: Math.floor(maximum) + 1 }, (_, value) => <g key={value}><line x1="112" x2="790" y1={yFor(value)} y2={yFor(value)} stroke="#173247" strokeWidth="1"/><text x="98" y={yFor(value) + 4} textAnchor="end" fill="#7795ad" fontSize="12">{value}</text><line x1="103" x2="112" y1={yFor(value)} y2={yFor(value)} stroke="#7190a8"/></g>)}
    <line x1="110" y1={groundY} x2="790" y2={groundY} stroke="#9cb84f" strokeWidth="4"/>{Array.from({ length: 22 }, (_, index) => <line key={index} x1={112 + index * 31} y1={groundY} x2={101 + index * 31} y2={groundY + 14} stroke="#6b8f43" strokeWidth="2"/>)}
    <polygon points={`${poleX - 25},${groundY + 15} ${poleX + 25},${groundY + 15} ${poleX + 11},${yFor(pole.topHeightM || maximum)} ${poleX - 10},${yFor(pole.topHeightM || maximum)}`} fill={`url(#pole-${pole.id})`} stroke="#e0a06d" strokeWidth="2"/>
    <ellipse cx={poleX} cy={yFor(pole.topHeightM || maximum)} rx="12" ry="6" fill="#c78859" stroke="#071522" strokeWidth="3"/>
    <text x="48" y="390" transform="rotate(-90 48 390)" fill="#86a7c2" fontSize="12" letterSpacing="2">HEIGHT ABOVE GROUND (m)</text>
    {sorted.map((item) => {
      const y = yFor(item.heightM), style = attachmentStyle(item.name), side = item.side === "left" ? -1 : 1;
      let labelY = y; while (placed.some((value) => Math.abs(value - labelY) < 28)) labelY += 30; placed.push(labelY);
      const active = focusAttachment?.id === item.id; const labelX = side < 0 ? 302 : 556;
      return <g key={item.id} opacity={focusAttachment && !active ? .48 : 1}>
        <Hardware kind={style.kind} x={poleX} y={y} side={side} color={style.color} />
        {labelY !== y && <line x1={poleX + side * 86} y1={y} x2={labelX - side * 18} y2={labelY} stroke={style.color} strokeWidth="1.5" strokeDasharray="4 4"/>}
        <circle cx={labelX} cy={labelY} r={active ? 7 : 4} fill={style.color}/><text x={labelX + side * 13} y={labelY + 4} textAnchor={side < 0 ? "end" : "start"} fill="#f4f8fb" fontWeight="700" fontSize="13">{item.name}</text><text x={labelX + side * 13} y={labelY + 20} textAnchor={side < 0 ? "end" : "start"} fill={style.color} fontWeight="700" fontSize="12">{item.heightM.toFixed(3)} m</text>
      </g>;
    })}
    <text x={poleX} y="746" textAnchor="middle" fill="#62aaf5" fontWeight="700" fontSize="13" letterSpacing="1">{pole.poleName}</text><text x="786" y="728" textAnchor="end" fill="#91b858" fontSize="12">GROUND {pole.elevationM.toFixed(2)} m AMSL</text><text x="150" y={yFor(pole.topHeightM || maximum) - 10} fill="#ff9859" fontWeight="700" fontSize="12">TOP {meters(pole.topHeightM)}</text><line x1="230" y1={yFor(pole.topHeightM || maximum) - 14} x2={poleX - 12} y2={yFor(pole.topHeightM || maximum) - 14} stroke="#ff9859" strokeWidth="2" strokeDasharray="6 5"/>
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

function PoleDataSection({ pole, onLocate, onDownload, projectId }: { pole: PoleRecord; onLocate: (attachment: AttachmentRecord) => void; onDownload: () => void; projectId: string }) {
  return <section className="pole-data-grid"><article className="location-card"><div className="section-heading"><p className="eyebrow">LOCATION</p><h2>Survey coordinates</h2></div><div className="location-values"><span><small>Latitude</small><strong>{pole.latitude}</strong></span><span><small>Longitude</small><strong>{pole.longitude}</strong></span><span><small>Ground elevation</small><strong>{pole.elevationM.toFixed(2)} m</strong></span><span><small>Pole top</small><strong>{meters(pole.topHeightM)}</strong></span><span><small>Pole height</small><strong>{pole.poleHeightFt ?? "—"} ft</strong></span><span><small>Class</small><strong>{pole.poleClass ?? "—"}</strong></span></div><a href={`https://www.google.com/maps/@?api=1&map_action=map&center=${pole.latitude},${pole.longitude}&zoom=20&basemap=satellite`} target="_blank" rel="noreferrer">Open in Google Maps satellite <ExternalLink /></a></article><article className="schedule-card"><div className="section-heading schedule-heading"><span><p className="eyebrow">MEASUREMENTS</p><h2>Attachment schedule</h2></span><span className="schedule-actions"><button onClick={onDownload}><Download /> Download pole</button><a href={`/projects/${projectId}/poles/${pole.id}/report`} target="_blank"><Ruler /> Print / PDF</a></span></div><div className="schedule-table"><header><span>Attachment</span><span>Type</span><span>Height</span><span>Photo side</span></header>{pole.attachments.length ? pole.attachments.map((item) => { const style = attachmentStyle(item.name); return <button key={item.id} onClick={() => onLocate(item)}><span><i style={{ background: style.color }} />{item.name}</span><span>{style.label}</span><strong>{item.heightM.toFixed(3)} m</strong><span>{item.side}<LocateFixed /></span></button>; }) : <div className="schedule-empty">No measured attachment points in the uploaded JSON.</div>}</div></article></section>;
}

function worldPoint(lon: number, lat: number, zoom: number) { const scale = 256 * 2 ** zoom; const sin = Math.sin(clamp(lat, -85.0511, 85.0511) * Math.PI / 180); return { x: (lon + 180) / 360 * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }; }
function pointToLonLat(x: number, y: number, zoom: number) { const scale = 256 * 2 ** zoom; const lon = x / scale * 360 - 180; const n = Math.PI - 2 * Math.PI * y / scale; return { lon, lat: 180 / Math.PI * Math.atan(Math.sinh(n)) }; }

function SatelliteMap({ poles, selected, onSelect, onOpen, project }: { poles: PoleRecord[]; selected: PoleRecord | null; onSelect: (pole: PoleRecord) => void; onOpen: (pole: PoleRecord) => void; project: ProjectInfo }) {
  const frame = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 1100, height: 700 }); const [zoom, setZoom] = useState(16); const [center, setCenter] = useState({ lon: poles[0]?.longitude ?? 0, lat: poles[0]?.latitude ?? 0 });
  useEffect(() => { const node = frame.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, []);
  const fit = useCallback(() => { if (!poles.length) return; const xs = poles.map((pole) => worldPoint(pole.longitude, pole.latitude, 0).x); const ys = poles.map((pole) => worldPoint(pole.longitude, pole.latitude, 0).y); const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys); const fitZoom = clamp(Math.floor(Math.log2(Math.min((size.width - 150) / Math.max(1, maxX - minX), (size.height - 150) / Math.max(1, maxY - minY)))), 2, 19); const middle = pointToLonLat((minX + maxX) / 2 * 2 ** fitZoom, (minY + maxY) / 2 * 2 ** fitZoom, fitZoom); setZoom(fitZoom); setCenter(middle); }, [poles, size.height, size.width]);
  useEffect(() => { fit(); }, [fit]);
  const centerWorld = worldPoint(center.lon, center.lat, zoom); const left = centerWorld.x - size.width / 2, top = centerWorld.y - size.height / 2; const tiles: { key: string; x: number; y: number; urlX: number }[] = []; const count = 2 ** zoom;
  for (let ty = Math.floor(top / 256); ty <= Math.floor((top + size.height) / 256); ty += 1) for (let tx = Math.floor(left / 256); tx <= Math.floor((left + size.width) / 256); tx += 1) if (ty >= 0 && ty < count) tiles.push({ key: `${tx}-${ty}`, x: tx, y: ty, urlX: ((tx % count) + count) % count });
  const changeZoom = (next: number) => setZoom(clamp(next, 2, 20));
  return <section className="map-panel"><header className="map-heading"><p><small>SATELLITE MAP</small><strong>{project.location_label || "Pole locations"}</strong></p><span>Drag to pan • Scroll to zoom • Click a named pole</span></header><div ref={frame} className="slippy-map" onWheel={(event) => { event.preventDefault(); changeZoom(zoom + (event.deltaY < 0 ? 1 : -1)); }} onPointerDown={(event) => { if (event.button !== 0 || (event.target as HTMLElement).closest("button,a,.map-selected-card")) return; drag.current = { x: event.clientX, y: event.clientY, centerX: centerWorld.x, centerY: centerWorld.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; const world = { x: drag.current.centerX - (event.clientX - drag.current.x), y: drag.current.centerY - (event.clientY - drag.current.y) }; setCenter(pointToLonLat(world.x, world.y, zoom)); }} onPointerUp={() => { drag.current = null; }}>
    <div className="map-tiles">{tiles.map((tile) => <img key={tile.key} src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.urlX}`} alt="" draggable={false} style={{ left: tile.x * 256 - left, top: tile.y * 256 - top }} />)}</div>
    <span className="imagery-badge"><i /> SATELLITE IMAGERY</span><div className="map-controls"><button onClick={() => changeZoom(zoom + 1)}><Plus /></button><button onClick={() => changeZoom(zoom - 1)}><Minus /></button><button onClick={fit}><Crosshair /></button></div>
    {poles.map((pole) => { const point = worldPoint(pole.longitude, pole.latitude, zoom); return <button key={pole.id} className={`map-pole-marker ${selected?.id === pole.id ? "selected" : ""}`} style={{ left: point.x - left, top: point.y - top }} onClick={() => onSelect(pole)}><i /><span>{pole.poleName}</span></button>; })}
    <div className="map-legend"><span><i className="complete" /> Measurements + model</span><span><i className="location" /> Location only</span></div>
    {selected && <div className="map-selected-card"><header><p><small>SELECTED POLE</small><strong>{selected.poleName}</strong></p><span>{selected.attachments.length} points</span></header>{selected.imageFilename ? <PhotoZoom pole={selected} projectId={selected.projectId} focusAttachment={null} /> : <div className="map-no-image"><ImageIcon /> No photo uploaded</div>}<div className="map-pole-data"><span><small>Latitude</small><strong>{selected.latitude}</strong></span><span><small>Longitude</small><strong>{selected.longitude}</strong></span><span><small>Ground elevation</small><strong>{meters(selected.elevationM)}</strong></span><span><small>Pole top</small><strong>{meters(selected.topHeightM)}</strong></span></div><div className="map-attachments"><p><span>ATTACHMENT HEIGHTS</span><b>{selected.attachments.length} ITEMS</b></p>{selected.attachments.slice(0, 8).map((item) => <button key={item.id} onClick={() => onOpen(selected)}><span><i style={{ background: attachmentStyle(item.name).color }} />{item.name}</span><strong>{item.heightM.toFixed(3)} m</strong></button>)}</div><div className="map-card-actions"><button onClick={() => onOpen(selected)}><SplitSquareVertical /> View photo + SPIDA</button><a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@?api=1&map_action=map&center=${selected.latitude},${selected.longitude}&zoom=20&basemap=satellite`}>Google satellite <ExternalLink /></a></div></div>}
  </div></section>;
}
