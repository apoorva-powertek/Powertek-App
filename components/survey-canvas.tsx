"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* Browser blob photos and map tiles must retain their original pixels. */
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useRef,useState} from "react";
import {Crosshair,Focus,Image as ImageIcon,LoaderCircle,Maximize2,Minus,Plus,Map as MapIcon} from "lucide-react";
import type {AttachmentRecord,PoleRecord} from "@/lib/portal-types";
import type {ProjectInfo} from "@/lib/project-types";
import {attachmentStyle} from "@/lib/attachment-style";
import {fitSurveyViewport,worldPoint,pointToLonLat,mapPixelX} from "@/lib/map-viewport";
import {authenticatedFetch} from "@/lib/supabase";
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const meters=(value:number|null|undefined)=>value==null?'—':`${Number(value).toFixed(2)} m`;
const projectImageUrl=(projectId:string,poleId:string)=>`/api/projects/${encodeURIComponent(projectId)}/poles/${encodeURIComponent(poleId)}/image`;
export function PanelHeader({ eyebrow, title, trailing }: { eyebrow: string; title: string; trailing: string }) { return <header className="panel-header"><p><small>{eyebrow}</small><strong>{title}</strong></p><span>{trailing}</span></header>; }


export function PhotoZoom({ pole, projectId, focusAttachment, canEdit=false, onAddPhoto, onRefreshPhoto }: { pole: PoleRecord; projectId: string; focusAttachment: AttachmentRecord | null; canEdit?:boolean;onAddPhoto?:()=>void;onRefreshPhoto?:()=>Promise<void> }) {
  const frame = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [imageSrc, setImageSrc] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [natural, setNatural] = useState({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 });
  const [size, setSize] = useState({ width: 700, height: 650 }); const [scale, setScale] = useState(0.2); const [pan, setPan] = useState({ x: 0, y: 0 }); const [loaded, setLoaded] = useState(false);
  const fitScale = Math.min(size.width / natural.width, size.height / natural.height) * 0.94;
  const fit = useCallback(() => { setScale(fitScale); setPan({ x: (size.width - natural.width * fitScale) / 2, y: (size.height - natural.height * fitScale) / 2 }); }, [fitScale, natural.height, natural.width, size.height, size.width]);
  useEffect(() => { const node = frame.current; if (!node) return; const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height })); observer.observe(node); return () => observer.disconnect(); }, [pole.id,pole.imageFilename,pole.photoAvailable]);
  useEffect(() => {
    if (!pole.imageFilename || pole.photoAvailable===false) return;
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
  }, [pole.id,pole.imageFilename,pole.updatedAt,pole.photoAvailable,projectId,photoAttempt]);
  useEffect(() => { setLoaded(false); setNatural({ width: pole.imageWidth || 3024, height: pole.imageHeight || 4032 }); }, [pole.id, pole.imageHeight, pole.imageWidth]);
  useEffect(() => { fit(); }, [fit]);
  useEffect(() => { if (!focusAttachment || focusAttachment.photoX == null || focusAttachment.photoY == null) return; const next = Math.max(fitScale * 2.6, 0.75); setScale(next); setPan({ x: size.width / 2 - focusAttachment.photoX * next, y: size.height / 2 - focusAttachment.photoY * next }); }, [focusAttachment, fitScale, size.height, size.width]);
  const zoom = (factor: number) => { const next = clamp(scale * factor, fitScale * 0.75, 8); setPan((value) => ({ x: size.width / 2 - (size.width / 2 - value.x) * (next / scale), y: size.height / 2 - (size.height / 2 - value.y) * (next / scale) })); setScale(next); };
  if (!pole.imageFilename||pole.photoAvailable===false) return <div className="no-photo"><ImageIcon/><h3>{pole.imageFilename?'Original photo needs restoring':'No photo added yet'}</h3><p>{pole.imageFilename?'The photo name was imported, but its original file is missing. Add the original image to restore this view.':'Add an original image to view this pole beside its measured model.'}</p>{canEdit&&<button className="pr-button secondary" onClick={onAddPhoto}><Plus size={17}/>Add photo to this pole</button>}{onRefreshPhoto&&<button className="pr-text" onClick={()=>void onRefreshPhoto()}>Check again</button>}</div>;
  return <div ref={frame} className="photo-zoom" onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.18 : 0.85); }} onPointerDown={(event) => { if (event.button !== 0 || (event.target as Element).closest("button,a,input,select,textarea")) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.px + event.clientX - drag.current.x, y: drag.current.py + event.clientY - drag.current.y }); }} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    {!loaded && !photoError && <div className="image-loading"><LoaderCircle className="spin" /> Loading original pixels…</div>}
    {photoError && <div className="photo-load-error" role="alert"><ImageIcon size={28}/><h3>Original photo unavailable</h3><p>{photoError}</p><button className="workspace-button secondary" onPointerDown={event => event.stopPropagation()} onClick={() => setPhotoAttempt(value => value + 1)}>Retry photo</button>{canEdit&&<button className="pr-text" onClick={onAddPhoto}>Add photo to this pole</button>}</div>}
    <div className="photo-stage" style={{ width: natural.width, height: natural.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}><img src={imageSrc || undefined} alt={`${pole.poleName} full-resolution measured pole`} draggable={false} onError={() => { if (imageSrc) setPhotoError("This photo could not be displayed. Retry or upload a supported image."); }} onLoad={(event) => { const image = event.currentTarget; setNatural({ width: image.naturalWidth, height: image.naturalHeight }); setLoaded(true); setPhotoError(""); }} /><PhotoOverlay pole={pole} /></div>
    {loaded&&!photoError&&<><div className="zoom-toolbar"><button onClick={() => zoom(0.8)} aria-label="Zoom out"><Minus /></button><strong>{Math.round(scale * 100)}%</strong><button onClick={() => zoom(1.25)} aria-label="Zoom in"><Plus /></button><button onClick={() => { setScale(1); setPan({ x: size.width / 2 - natural.width / 2, y: size.height / 2 - natural.height / 2 }); }}>100%</button><button onClick={fit}><Focus /> Fit</button></div><span className="fullres-badge"><Maximize2 /> {natural.width} × {natural.height} original</span><span className="drag-hint">Scroll to zoom · drag to move</span></>}
  </div>;
}

function PhotoOverlay({ pole }: { pole: PoleRecord }) {
  const width = pole.imageWidth || 3024, height = pole.imageHeight || 4032;
  const labels = pole.attachments.filter((item) => item.photoX != null && item.photoY != null);
  return <svg className="photo-overlay" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Measured attachment height overlay">{pole.baseX != null && pole.baseY != null && pole.topX != null && pole.topY != null && <><line x1={pole.baseX} y1={pole.baseY} x2={pole.topX} y2={pole.topY} stroke="#ffbb45" strokeWidth="10" strokeDasharray="26 18" /><circle cx={pole.baseX} cy={pole.baseY} r="20" fill="#ffdf78" stroke="#071522" strokeWidth="7" /><circle cx={pole.topX} cy={pole.topY} r="20" fill="#ff8250" stroke="#071522" strokeWidth="7" /></>}{labels.map((item) => { const style = attachmentStyle(item.name); const x = Number(item.photoX), y = Number(item.photoY); const left = item.side === "left"; const lineX = left ? x - 310 : x + 310; return <g key={item.id}><polyline points={`${x},${y} ${lineX},${y}`} stroke={style.color} strokeWidth="9" /><circle cx={x} cy={y} r="19" fill={style.color} stroke="#071522" strokeWidth="7" /><rect x={left ? lineX - 390 : lineX + 8} y={y - 34} width="382" height="58" rx="9" fill="#071522" fillOpacity=".88" /><text x={left ? lineX - 18 : lineX + 25} y={y + 7} textAnchor={left ? "end" : "start"} fill="white" fontSize="29" fontWeight="700">{item.name} • {item.heightM.toFixed(3)} m</text></g>; })}</svg>;
}

export function ModelZoom({ pole, focusAttachment }: { pole: PoleRecord; focusAttachment: AttachmentRecord | null }) {
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

export function SatelliteMap({ poles, selected, onSelect, project }: { poles: PoleRecord[]; selected: PoleRecord | null; onSelect: (pole: PoleRecord) => void; project: ProjectInfo }) {
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
    <div className="map-tiles">{tiles.map((tile) => <img key={`${zoom}-${tile.key}-${imageryAttempt}`} onLoad={event=>event.currentTarget.removeAttribute("aria-hidden")} onError={event=>{event.currentTarget.setAttribute("aria-hidden","true");setImageryFailed(true);}} src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tile.y}/${tile.urlX}`} alt="" draggable={false} style={{ left: tile.x * 256 - left, top: tile.y * 256 - top }} />)}</div>
    <span className="imagery-badge"><i /> SATELLITE IMAGERY</span><div className="map-controls"><button aria-label="Zoom map in" onClick={() => changeZoom(zoom + 1)}><Plus /></button><button aria-label="Zoom map out" onClick={() => changeZoom(zoom - 1)}><Minus /></button><button aria-label="Fit map to poles" onClick={fit}><Crosshair /></button></div>
    {poles.map((pole) => { const point = worldPoint(pole.longitude, pole.latitude, zoom); return <button key={pole.id} className={`map-pole-marker ${pole.status==="complete"?"complete":"location"} ${selected?.id === pole.id ? "selected" : ""}`} aria-label={`Select pole ${pole.poleName}`} style={{left:mapPixelX(pole.longitude,center.lon,zoom,size.width),top:point.y-top}} onClick={() => onSelect(pole)}><i />{(zoom>=17||selected?.id===pole.id)&&<span>{pole.poleName}</span>}</button>; })}
    <div className="map-legend"><span><i className="complete"/>Survey complete</span><span><i className="location"/>Location only</span></div><a className="map-attribution" href="https://www.esri.com/en-us/legal/terms/data-attributions" target="_blank" rel="noreferrer">Imagery © Esri, Maxar &amp; contributors</a>
    {imageryFailed&&poles.length>0&&<div className="map-load-notice" role="status">Satellite imagery could not load. Pole locations remain available.<button onClick={()=>{setImageryFailed(false);setImageryAttempt(n=>n+1);}}>Retry imagery</button></div>}
    {!poles.length&&<div className="map-empty-state"><MapIcon size={28}/><strong>No survey locations to display</strong><p>Upload pole locations or clear your filters.</p></div>}

  </div></section>;
}

