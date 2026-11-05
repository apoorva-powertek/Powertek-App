"use client";
import {useEffect,useState} from 'react';
import {Check,CloudUpload,ImagePlus,LoaderCircle} from 'lucide-react';
import type {PoleRecord} from '@/lib/portal-types';
import {readSurveyPackage,type SurveyPackage} from '@/lib/survey-import-browser';
import {authenticatedFetch,createBrowserSupabase} from '@/lib/supabase';
import {WorkspaceDialog} from './workflow-dialog';
import {SurveyPackagePreview} from './survey-package-preview';

export function ProjectPhotoUpload({pole,onClose,onSaved}:{pole:PoleRecord;onClose:()=>void;onSaved:()=>Promise<void>}){
 const [pack,setPack]=useState<SurveyPackage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[phase,setPhase]=useState(''),[saved,setSaved]=useState(false);
 const [uploaded,setUploaded]=useState(false);
 useEffect(()=>{if(!pack||saved)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pack,saved]);
 const close=()=>{if(busy)return;if(pack&&!saved&&!window.confirm('Discard the selected photo? It has not been saved yet.'))return;onClose();};
 async function choose(file?:File){
  if(!file)return;setBusy(true);setError('');setPack(null);setSaved(false);setUploaded(false);setPhase('Checking your photo…');
  try{
   if(!/\.(jpe?g|png|webp)$/i.test(file.name))throw new Error('Choose a JPG, PNG or WebP photo so it can be previewed in every browser.');
   if(file.size>52428800)throw new Error('Photos must be 50 MB or smaller.');
   let width=0,height=0;const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw new Error('Invalid photo');width=image.naturalWidth;height=image.naturalHeight;}catch{throw new Error('This file could not be displayed as an image. Choose a valid JPG, PNG or WebP photo.');}finally{URL.revokeObjectURL(url);}
   const extension=file.name.split('.').pop();
   const matched=new File([file],`${pole.poleName.replace(/[\\/]/g,'_')}.${extension}`,{type:file.type});
   const next=await readSurveyPackage(pole.projectId,null,[],[matched],[pole.poleName],[pole]);
   next.poles[0].imageWidth=width;next.poles[0].imageHeight=height;
   if(file.name.toLowerCase()!==pole.imageFilename?.toLowerCase()||width!==pole.imageWidth||height!==pole.imageHeight){next.poles[0].baseX=null;next.poles[0].baseY=null;next.poles[0].topX=null;next.poles[0].topY=null;next.poles[0].attachments=next.poles[0].attachments?.map(a=>({...a,photoX:null,photoY:null}));}
   next.files[0].name=file.name.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,180);
   setPack(next);setPhase('Photo checked. Confirm the preview to save it.');
  }catch(e){setError(e instanceof Error?e.message:'Could not prepare this photo.');setPhase('');}finally{setBusy(false);}
 }
 async function request(body:unknown){const response=await authenticatedFetch(`/api/projects/${encodeURIComponent(pole.projectId)}/import`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Could not save the photo.');}
 async function save(){
  if(!pack)return;setBusy(true);setError('');
  try{
   setPhase('Preparing your photo…');await request({action:'prepare',id:pack.id,sourceName:'Photo for '+pole.poleName,poles:pack.poles,files:pack.files.map(({blob,...file})=>{void blob;return file;})});
   if(!uploaded){setPhase('Uploading the original photo…');const file=pack.files[0];const result=await createBrowserSupabase().storage.from('project-files').upload(file.objectKey,file.blob,{contentType:file.type,upsert:false});if(result.error&&!['409','Duplicate'].includes(String((result.error as {statusCode?:string}).statusCode)))throw new Error(result.error.message);setUploaded(true);}
   setPhase('Attaching the photo and keeping existing measurements…');await request({action:'commit',id:pack.id});await onSaved();setSaved(true);setPhase('Photo saved. The original is now available in this project.');
  }catch(e){setError(e instanceof Error?e.message:'Upload paused. Retry to continue.');setPhase('Upload paused. You can retry while this dialog stays open.');}finally{setBusy(false);}
 }
 return <WorkspaceDialog title={`Add photo to ${pole.poleName}`} onClose={close} closeDisabled={busy}><div className="pr-photo-upload" aria-busy={busy}>
  <p>The photo attaches directly to <strong>{pole.poleName}</strong>. Existing coordinates and measurements stay intact. A different photo keeps attachment heights and clears old photo markers for a fresh review. Administrator approval is required before client release.</p>
  {!saved&&<label className="pr-photo-picker"><ImagePlus size={28}/><strong>Choose the original pole photo</strong><span>JPG, PNG or WebP · up to 50 MB</span><input aria-label="Original pole photo" type="file" accept=".jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>void choose(e.target.files?.[0])}/></label>}
  {error&&<p className="error-banner" role="alert">{error}</p>}
  {pack&&!saved&&<><SurveyPackagePreview pack={pack} initialTab="photos"/><button className="pr-button primary" disabled={busy} onClick={()=>void save()}>{busy?<LoaderCircle size={18} className="spin"/>:<CloudUpload size={18}/>} {busy?'Saving photo…':uploaded?'Retry photo upload':'Save photo to this pole'}</button></>}
  {phase&&<p role="status" className={saved?'pr-saved':''}>{saved&&<Check size={18}/>} {phase}</p>}
  {saved&&<button className="pr-button primary" onClick={onClose}>View restored photo</button>}
 </div></WorkspaceDialog>;
}
