import { Check } from "lucide-react";
export function ProjectWorkflowSteps({step}:{step:number}) {
 const steps=[['Project details','Choose a client and name'],['Upload & preview','Add and check your files'],['Admin review','Approve the survey data'],['Client access','Notify and download']];
 return <div className="workflow-steps" aria-label="Project workflow">{steps.map(([name,detail],index)=><div className={`workflow-step ${index===step?'active':index<step?'complete':''}`} key={name} aria-current={index===step?'step':undefined}><span>{index<step?<Check size={15}/>:index+1}</span><div><strong>{name}</strong><small>{detail}</small></div></div>)}</div>;
}
