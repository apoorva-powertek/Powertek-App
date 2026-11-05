"use client";
/* Local file previews use browser blob URLs before any upload. */
/* eslint-disable @next/next/no-img-element */
import {useEffect,useState} from "react";
import {FileImage,FileSpreadsheet,FileJson2} from "lucide-react";
import type {SurveyPackage} from "@/lib/survey-import-browser";
export function SurveyPackagePreview({pack,initialTab="records"}:{pack:SurveyPackage;initialTab?:"records"|"photos"|"files"}){
 const [tab,setTab]=useState(initialTab);
 const images=pack.files.filter(f=>f.kind==='image');
 return <><div className="preview-tabs" role="tablist" aria-label="Package preview"><button role="tab" aria-selected={tab==='records'} onClick={()=>setTab('records')}>Records ({pack.poles.length})</button><button role="tab" aria-selected={tab==='photos'} onClick={()=>setTab('photos')}>Photos ({images.length})</button><button role="tab" aria-selected={tab==='files'} onClick={()=>setTab('files')}>Files ({pack.files.length})</button></div>
 {tab==='records'&&<div className="quality-table" role="region" aria-label="Survey records preview" tabIndex={0}><table><thead><tr><th>Pole</th><th>Latitude</th><th>Longitude</th><th>Attachments</th></tr></thead><tbody>{pack.poles.slice(0,50).map(p=><tr key={p.poleName}><td>{p.poleName}</td><td>{p.latitude}</td><td>{p.longitude}</td><td>{p.attachments?.length??0}</td></tr>)}</tbody></table>{pack.poles.length>50&&<p>Showing 50 of {pack.poles.length} validated records.</p>}</div>}
 {tab==='photos'&&<div className="file-gallery">{images.slice(0,12).map(f=><Photo key={f.objectKey} file={f}/>)}{!images.length&&<p>No new photos selected. Existing stored photos are kept.</p>}{images.length>12&&<p>Showing the first 12 of {images.length} photos.</p>}</div>}
 {tab==='files'&&<div className="quality-table" role="region" aria-label="Source files preview" tabIndex={0}><table><thead><tr><th>File</th><th>Type</th><th>Size</th><th>Matched pole</th></tr></thead><tbody>{pack.files.map(f=><tr key={f.objectKey}><td>{f.kind==='image'?<FileImage size={14}/>:f.kind==='json'?<FileJson2 size={14}/>:<FileSpreadsheet size={14}/>} {f.name}</td><td>{f.kind}</td><td>{(f.size/1048576).toFixed(2)} MB</td><td>{f.poleName??'Project source'}</td></tr>)}</tbody></table></div>}</>;
}
function Photo({file}:{file:SurveyPackage['files'][number]}){
 const [src,setSrc]=useState('');const [failed,setFailed]=useState(false);
 useEffect(()=>{const url=URL.createObjectURL(file.blob);const timer=window.setTimeout(()=>setSrc(url),0);return()=>{window.clearTimeout(timer);URL.revokeObjectURL(url);};},[file.blob]);
 return <div className="file-preview">{src&&!failed?<img src={src} alt={`Preview of ${file.name}`} onError={()=>setFailed(true)}/>:<FileImage aria-label="Preview unavailable"/>}<span title={file.name}>{file.name}</span><span>{file.poleName?`Matched: ${file.poleName}`:'No matching pole'}</span></div>;
}
