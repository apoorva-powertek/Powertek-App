"use client";
import { useEffect, useState } from "react";
import type { ProjectRow } from "./portal-app";
import { authenticatedFetch, createBrowserSupabase } from "@/lib/supabase";
import { readSurveyPackage, type SurveyPackage } from "@/lib/survey-import-browser";
import { CloudUpload, LoaderCircle, Check, ShieldCheck } from "lucide-react";

async function importRequest(projectId: string, body: unknown) {
  const response=await authenticatedFetch(`/api/projects/${encodeURIComponent(projectId)}/import`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({})) as {error?:string;importedPoles?:number};
  if(!response.ok) throw new Error(result.error||"Could not save the import. Retry when your connection is available.");
  return result;
}
export function ImportDialog({projects,onComplete,onPendingChange}:{projects:ProjectRow[];onPendingChange?:(pending:boolean)=>void;onComplete:(message:string)=>Promise<void>|void}) {
  const [projectId,setProjectId]=useState(projects[0]?.id??"");
  const [spreadsheet,setSpreadsheet]=useState<File|null>(null),[jsonFiles,setJsonFiles]=useState<File[]>([]),[imageFiles,setImageFiles]=useState<File[]>([]);
  const [preview,setPreview]=useState<SurveyPackage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [completed,setCompleted]=useState<string[]>([]),[phase,setPhase]=useState(""),[published,setPublished]=useState(false);
  useEffect(()=>{onPendingChange?.(busy||Boolean(preview));return()=>onPendingChange?.(false);},[busy,preview,onPendingChange]);
  useEffect(()=>{if(!busy&&!preview)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[busy,preview]);
  function reset(){setPreview(null);setCompleted([]);setError("");setPublished(false);setPhase("");}
  async function validate(){
    if(!spreadsheet||!projectId)return;
    setBusy(true);setError("");setPhase("Validating every record and matching source files…");
    try{
      const response=await authenticatedFetch(`/api/projects/${encodeURIComponent(projectId)}/poles`);
      const data=await response.json() as {error?:string;poles?:{poleName:string}[]};if(!response.ok)throw new Error(data.error||"Could not check existing poles.");
      const pack=await readSurveyPackage(projectId,spreadsheet,jsonFiles,imageFiles,(data.poles??[]).map((p:{poleName:string})=>p.poleName));
      setPreview(pack);setCompleted([]);setPhase("Ready for your review");
    }catch(e){setError(e instanceof Error?e.message:"Could not validate files.");}finally{setBusy(false);}
  }
  async function publish(){
    if(!preview)return;setBusy(true);setError("");
    try{
      setPhase("Preparing private upload…");
      await importRequest(preview.projectId,{action:"prepare",id:preview.id,sourceName:preview.sourceName,poles:preview.poles,files:preview.files.map(({blob,...file})=>{void blob;return file;})});
      let count=completed.length;
      for(const file of preview.files){
        if(completed.includes(file.objectKey))continue;
        setPhase(`Uploading ${count+1} of ${preview.files.length}: ${file.name}`);
        const {error:uploadError}=await createBrowserSupabase().storage.from("project-files").upload(file.objectKey,file.blob,{contentType:file.type,upsert:false});
        // A lost response may follow a successful upload. Commit checks stored sizes.
        if(uploadError && !["409","Duplicate"].includes(String((uploadError as {statusCode?:string;error?:string}).statusCode??(uploadError as {error?:string}).error))) throw new Error(`${file.name}: ${uploadError.message}`);
        count+=1;setCompleted(previous=>[...previous,file.objectKey]);
      }
      setPhase("Publishing records and file links together…");
      const result=await importRequest(preview.projectId,{action:"commit",id:preview.id});
      setPublished(true);setPreview(null);setPhase("Import published. Surveys are Uploaded and ready for review.");
      await onComplete(`${result.importedPoles} poles imported. Submit surveys for review from the project workspace.`);
    }catch(e){setError(e instanceof Error?e.message:"Upload paused. Retry to continue.");setPhase("Upload paused. Completed files are kept while this page stays open.");}finally{setBusy(false);}
  }
  return <section className="import-layout"><div className="import-card">
    <div className="card-heading"><span><CloudUpload/></span><div><p className="eyebrow">SURVEY IMPORT</p><h2>Validate, review, then publish</h2></div></div>
    <fieldset disabled={busy||Boolean(preview)} className="quality-fields">
      <label>Destination project<select value={projectId} onChange={e=>{reset();setProjectId(e.target.value);}}><option value="">Choose project</option>{projects.filter(p=>p.status==="active").map(p=><option key={p.id} value={p.id}>{p.client_name} — {p.name}</option>)}</select></label>
      <UploadField title="Pole locations" detail="CSV or Excel: pole name, latitude, longitude, elevation" accept=".csv,.xlsx,.xls" files={spreadsheet?[spreadsheet]:[]} onFiles={files=>{reset();setSpreadsheet(files[0]??null);}}/>
      <UploadField title="Measurement JSON" detail="JSON files or ZIP; exact pole ID matching" accept=".json,.zip" multiple files={jsonFiles} onFiles={files=>{reset();setJsonFiles(files);}}/>
      <UploadField title="Original photos" detail="JPG, PNG, WebP, HEIC or ZIP; originals preserved" accept=".jpg,.jpeg,.png,.webp,.heic,.zip" multiple files={imageFiles} onFiles={files=>{reset();setImageFiles(files);}}/>
    </fieldset>
    {error&&<div className="error-banner quality-error" role="alert">{error}</div>}
    {preview?<section className="import-preview" aria-label="Import preview"><h3>Review your package</h3><div className="quality-counts"><span><b>{preview.poles.length}</b> poles</span><span><b>{preview.files.length}</b> files</span><span><b>{preview.existing.length}</b> existing poles updated</span></div>
      {preview.warnings.length>0&&<ul>{preview.warnings.slice(0,20).map((w,i)=><li key={i}>{w}</li>)}</ul>}
      <div className="quality-table"><table><thead><tr><th>Pole</th><th>Latitude</th><th>Longitude</th><th>Attachments</th></tr></thead><tbody>{preview.poles.slice(0,20).map(p=><tr key={p.poleName}><td>{p.poleName}</td><td>{p.latitude}</td><td>{p.longitude}</td><td>{p.attachments?.length??0}</td></tr>)}</tbody></table></div>{preview.poles.length>20&&<p>Showing the first 20 of {preview.poles.length} validated records.</p>}
      <div className="quality-actions"><button className="orange-button" disabled={busy} onClick={()=>void publish()}>{busy?<LoaderCircle className="spin"/>:<CloudUpload/>}{busy?"Uploading…":completed.length?"Retry and publish":"Confirm and publish import"}</button><button className="workspace-button secondary" disabled={busy} onClick={reset}>Change package</button></div>
      <progress aria-label="Source files uploaded" value={completed.length} max={preview.files.length}/><p>{completed.length} of {preview.files.length} source files uploaded</p>
    </section>:<button className="orange-button import-button" disabled={busy||!spreadsheet||!projectId} onClick={()=>void validate()}>{busy?<LoaderCircle className="spin"/>:<Check/>}{busy?"Validating…":"Validate and preview"}</button>}
    {phase&&<p role="status">{phase}</p>}{published&&<a className="workspace-button primary" href={`/projects/${encodeURIComponent(projectId)}`}>Open project and review surveys</a>}
    </div><aside className="quality-card"><span><ShieldCheck/></span><p className="eyebrow">CONTROLLED PUBLISHING</p><h2>Check the package before it goes live.</h2><p>Invalid rows block the import. Photos and measurements match by exact pole ID, so similarly named poles stay separate.</p><ul><li><Check/>No records published until all files arrive</li><li><Check/>Retry failed uploads without repeating completed files</li><li><Check/>Review resets when survey data changes</li><li><Check/>Import and review history retained</li></ul><p>Keep this page open until publishing completes. Up to 5,000 poles and 500 MB per package, with a 50 MB limit per source file. Split larger jobs into smaller batches.</p></aside></section>;
}
function UploadField({title,detail,accept,multiple,files,onFiles}:{title:string;detail:string;accept:string;multiple?:boolean;files:File[];onFiles:(files:File[])=>void}){
  return <label className="upload-field"><span className="upload-copy"><strong>{title}</strong><small>{detail}</small><input aria-label={title} type="file" accept={accept} multiple={multiple} onChange={e=>onFiles(Array.from(e.target.files??[]))}/>{files.length>0&&<small>{files.length} selected: {files.slice(0,2).map(f=>f.name).join(", ")}</small>}</span></label>;
}
