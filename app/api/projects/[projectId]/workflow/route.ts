import {authErrorResponse,requireProjectEditor} from '@/lib/supabase';
import {qualityErrorResponse} from '@/lib/server/quality-response';
type Context={params:Promise<{projectId:string}>};
export async function GET(request:Request,context:Context){
 try{const {projectId}=await context.params;const {client}=await requireProjectEditor(request,projectId);const result=await client.rpc('project_workflow_context',{p_project_id:projectId});if(result.error)throw result.error;return Response.json(result.data);}
 catch(error){return qualityErrorResponse(error)??authErrorResponse(error);}
}
export async function POST(request:Request,context:Context){
 try{
  const {projectId}=await context.params;const {client}=await requireProjectEditor(request,projectId);
  const body=await request.json().catch(()=>null) as {action?:unknown;expectedUpdatedAt?:unknown;requestId?:unknown;recipientIds?:unknown;message?:unknown}|null;
  if(!body||typeof body.action!=='string'||!['submit','approve','release'].includes(body.action)||typeof body.expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(body.expectedUpdatedAt))||typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)||!Array.isArray(body.recipientIds)||body.recipientIds.length>100||body.recipientIds.some(id=>typeof id!=='string')||(body.message!=null&&(typeof body.message!=='string'||body.message.length>1000)))return Response.json({error:'Check the workflow details and try again.'},{status:400});
  const result=await client.rpc('advance_project_workflow',{p_project_id:projectId,p_action:body.action,p_expected_updated_at:body.expectedUpdatedAt,p_request_id:body.requestId,p_recipient_ids:body.recipientIds,p_message:body.message??''});
  if(result.error)throw result.error;return Response.json(result.data);
 }catch(error){return qualityErrorResponse(error)??authErrorResponse(error);}
}
