"use client";
import { useEffect, useState } from "react";
import type { PoleRecord } from "@/lib/portal-types";
import { authenticatedFetch } from "@/lib/supabase";
import { reviewActions, reviewLabels, reviewStages, type ReviewStage } from "@/lib/survey-quality";

type Activity = { id: number; occurred_at: string; actor_name: string; entity_type: string; entity_id: string; action: string; details: { pole?: string; from?: ReviewStage; to?: ReviewStage; note?: string; source?: string; poles?: number; files?: number; before?: Record<string,unknown>; after?: Record<string,unknown> } };
function description(event: Activity) {
  const d=event.details;
  if(event.action==="review_changed")return `${d.pole}: ${reviewLabels[d.from!]??d.from} → ${reviewLabels[d.to!]??d.to}`;
  if(event.action.startsWith("import_"))return `${event.action==="import_completed"?"Published import":"Prepared import"}: ${d.source} · ${d.poles??0} poles · ${d.files??0} files`;
  const label=String(d.after?.name??d.after?.display_name??d.before?.name??d.before?.display_name??event.entity_id);
  const names:Record<string,string>={clients:"Client",projects:"Project",portal_users:"Person",user_projects:"Project access"};
  const changes=Object.entries(d.after??{}).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(d.before?.[key])).map(([key,value])=>`${key.replaceAll("_"," ")}: ${typeof value==="object"?JSON.stringify(value):String(value)}`).join("; ");
  return `${names[event.entity_type]??event.entity_type} ${event.action==='insert'?'created':event.action==='delete'?'removed':'updated'} · ${label}${changes?` · ${changes}`:""}`;
}
export function ActivityLog({projectId,revision=0}:{projectId?:string;revision?:number}) {
  const [events,setEvents]=useState<Activity[]>([]),[next,setNext]=useState<string|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function load(before?:string){
    setBusy(true);setError("");
    try{const params=new URLSearchParams();if(projectId)params.set("projectId",projectId);if(before)params.set("before",before);
      const response=await authenticatedFetch(`/api/activity?${params}`),data=await response.json() as {error?:string;events:Activity[];next:string|null};
      if(!response.ok)throw new Error(data.error||"Could not load activity.");
      setEvents(previous=>before?[...previous,...data.events]:data.events);setNext(data.next);
    }catch(e){setError(e instanceof Error?e.message:"Could not load activity.");}finally{setBusy(false);}
  }
  // Reset pagination whenever the selected project or its data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[projectId,revision]);
  return <section className="quality-panel activity-panel" aria-label="Activity history"><header><div><p className="eyebrow">ACCOUNTABILITY</p><h2>Activity history</h2></div><button className="workspace-button secondary" disabled={busy} onClick={()=>void load()}>Refresh history</button></header>
    <p>History starts with this release. Times use your device’s time zone.</p>{error&&<p role="alert" className="error-banner">{error}</p>}
    {!events.length&&!busy&&!error&&<p>No activity recorded yet.</p>}
    <ol>{events.map(event=><li key={event.id}><div><strong>{description(event)}</strong>{event.details.note&&<p>{event.details.note}</p>}<small>{event.actor_name} · <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time></small></div></li>)}</ol>
    {next&&<button className="workspace-button secondary" disabled={busy} onClick={()=>void load(next)}>Load older activity</button>}{busy&&<p role="status">Loading history…</p>}
  </section>;
}
export function SurveyReview({pole,admin,canEdit,onChanged}:{pole:PoleRecord;admin:boolean;canEdit:boolean;onChanged:()=>Promise<void>}) {
  const [note,setNote]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const stage=pole.reviewStage??"uploaded";
  const [expanded,setExpanded]=useState(stage==="needs_review"&&canEdit);
  async function transition(target:ReviewStage){
    if(target==='uploaded'&&stage!=='draft'&&!note.trim()){setError("Add a reason before returning this survey to Uploaded.");return;}
    setBusy(true);setError("");
    try{const response=await authenticatedFetch(`/api/projects/${encodeURIComponent(pole.projectId)}/review`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({poleId:pole.id,stage:target,expectedUpdatedAt:pole.updatedAt,note})});
      const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||"Could not update review.");
      setNote("");await onChanged();
    }catch(e){setError(e instanceof Error?e.message:"Could not update review.");}finally{setBusy(false);}
  }
  const labels:Record<ReviewStage,string>={draft:"Draft",uploaded:stage==='draft'?"Mark uploaded":"Return to uploaded",needs_review:"Submit for review",approved:"Approve survey",delivered:"Mark delivered"};
  return <section className="quality-panel review-panel" aria-label="Survey review"><header><div><p className="eyebrow">SURVEY REVIEW · {pole.poleName}</p><h2>{reviewLabels[stage]}</h2></div><div className="quality-actions"><span className={`review-badge stage-${stage}`}>{reviewLabels[stage]}</span><button className="workspace-button secondary" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?"Hide review details":"Review details"}</button></div></header>
    {expanded&&<><ol className="review-steps">{reviewStages.map((s,i)=><li key={s} aria-current={s===stage?"step":undefined} className={i<=reviewStages.indexOf(stage)?"reached":""}>{reviewLabels[s]}</li>)}</ol>
    <p>Data completeness and engineering approval are tracked separately. Approval requires an uploaded photo and measured attachments.</p>
    {canEdit&&<><label>Review note <small>(required when returning a reviewed survey)</small><textarea value={note} maxLength={1000} onChange={e=>setNote(e.target.value)} placeholder="Record a review decision or explain the changes needed"/></label>{error&&<p className="error-banner" role="alert">{error}</p>}<div className="quality-actions">{reviewActions(stage,admin).map(target=><button className={`workspace-button ${target==='uploaded'?'secondary':'primary'}`} key={target} disabled={busy} onClick={()=>void transition(target)}>{busy?"Saving…":labels[target]}</button>)}<button className="workspace-button secondary" disabled={busy} onClick={()=>void onChanged().catch(()=>setError("Could not refresh survey."))}>Refresh survey</button></div>{!admin&&<small>Administrators approve surveys and mark them delivered.</small>}</>}</>}
  </section>;
}
