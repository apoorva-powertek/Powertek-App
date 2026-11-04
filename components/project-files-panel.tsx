"use client";
import {useCallback,useEffect,useState} from 'react';
import {Download,FolderArchive,FileImage,FileJson2,FileSpreadsheet,FolderOpen,LoaderCircle} from 'lucide-react';
import {workspaceRequest} from '@/lib/workspace-request';
import {createBrowserSupabase} from '@/lib/supabase';
type FileRow={id:string;filename:string;kind:string;object_key:string;size_bytes:number;created_at:string};
export function ProjectFilesPanel({projectId}:{projectId:string}){
 const [files,setFiles]=useState<FileRow[]>([]),[next,setNext]=useState<number|null>(null),[total,setTotal]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[downloading,setDownloading]=useState(''),[packaging,setPackaging]=useState(false),[progress,setProgress]=useState('');
 const load=useCallback(async(offset=0)=>{setBusy(true);setError('');try{const data=await workspaceRequest<{files:FileRow[];total:number;nextOffset:number|null}>(`/api/projects/${encodeURIComponent(projectId)}/files?offset=${offset}`);setFiles(previous=>offset?[...previous,...data.files]:data.files);setTotal(data.total);setNext(data.nextOffset);}catch(e){setError(e instanceof Error?e.message:'Could not load files.');}finally{setBusy(false);}},[projectId]);
 useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
 async function download(file:FileRow){setDownloading(file.id);setError('');try{const {data,error}=await createBrowserSupabase().storage.from('project-files').download(file.object_key);if(error||!data)throw new Error('This stored file is unavailable. Ask your administrator to upload the original file again.');const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download=file.filename;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:'Could not download this file.');}finally{setDownloading('');}}
 async function downloadPackage(){
  setPackaging(true);setError('');setProgress('Preparing project files…');
  try{
   const all:FileRow[]=[];let offset:number|null=0;
   while(offset!==null){
    const page:{files:FileRow[];nextOffset:number|null}=await workspaceRequest<{files:FileRow[];nextOffset:number|null}>(`/api/projects/${encodeURIComponent(projectId)}/files?offset=${offset}`);
    all.push(...page.files);offset=page.nextOffset;
    if(all.length>10000||all.reduce((sum,file)=>sum+file.size_bytes,0)>104857600)throw new Error('This package exceeds 100 MB or 10,000 files. Download the files individually below.');
   }
   if(!all.length)throw new Error('There are no source files to download yet.');
   const entries:Record<string,Uint8Array>={};let bytes=0;
   for(const [index,file] of all.entries()){
    setProgress(`Preparing ${index+1} of ${all.length}: ${file.filename}`);
    const {data,error}=await createBrowserSupabase().storage.from('project-files').download(file.object_key);
    if(error||!data)throw new Error(`${file.filename} is unavailable. Ask your administrator to upload the original file again.`);
    bytes+=data.size;if(bytes>104857600)throw new Error('This package exceeds 100 MB. Download the files individually below.');
    const safe=file.filename.replace(/[\\/\u0000-\u001f]/g,'_');
    entries[`${String(index+1).padStart(4,'0')}-${safe}`]=new Uint8Array(await data.arrayBuffer());
   }
   const {zipSync}=await import('fflate');
   const archive=zipSync(entries,{level:0});
   const url=URL.createObjectURL(new Blob([archive.buffer as ArrayBuffer],{type:'application/zip'}));
   const link=document.createElement('a');link.href=url;link.download='project-files.zip';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setProgress('Your project package is ready.');
  }catch(e){setError(e instanceof Error?e.message:'Could not prepare your project package.');setProgress('');}finally{setPackaging(false);}
 }
 return <section className="quality-panel project-files-panel" aria-label="Project files"><header><div><p className="eyebrow">ORIGINAL SOURCE FILES</p><h2>View and download project files</h2></div><span className="subtle-badge">{total} files</span></header><p>Original location sheets, measurements and photos are available to signed-in people with access to this project.</p>{error&&<p className="error-banner" role="alert">{error}</p>}<div className="project-table-wrap" tabIndex={0} role="region" aria-label="Project source files"><table className="workspace-table"><thead><tr><th>File</th><th>Type</th><th>Size</th><th><span className="sr-only">Download</span></th></tr></thead><tbody>{files.map(file=><tr key={file.id}><td><span className="source-file-name">{file.kind==='image'?<FileImage size={17}/>:file.kind==='json'?<FileJson2 size={17}/>:<FileSpreadsheet size={17}/>} {file.filename}</span></td><td>{file.kind}</td><td>{(file.size_bytes/1048576).toFixed(2)} MB</td><td><button className="workspace-button secondary" disabled={Boolean(downloading)||packaging} aria-label={`Download ${file.filename}`} onClick={()=>void download(file)}>{downloading===file.id?<LoaderCircle size={16} className="spin"/>:<Download size={16}/>}Download</button></td></tr>)}</tbody></table></div>{!files.length&&!busy&&!error&&<div className="workspace-empty"><FolderOpen size={30}/><h3>No source files yet</h3><p>Add the original survey files through Upload data.</p></div>}{busy&&<p role="status">Loading source files…</p>}{progress&&<p role="status">{progress}</p>}<div className="delivery-actions"><button className="workspace-button primary" disabled={busy||packaging||Boolean(downloading)||!total} onClick={()=>void downloadPackage()}>{packaging?<LoaderCircle size={16} className="spin"/>:<FolderArchive size={16}/>}Download project package</button>{next!==null&&<button className="workspace-button secondary" disabled={busy||packaging} onClick={()=>void load(next)}>Load more files</button>}<button className="workspace-button secondary" disabled={busy||packaging} onClick={()=>void load()}>Refresh files</button></div><p className="permission-note">ZIP packages support up to 100 MB. Larger projects can be downloaded file by file.</p></section>;
}
