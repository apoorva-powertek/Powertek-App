import {authErrorResponse,requirePortalUser} from '@/lib/supabase';
export async function POST(request:Request){
 try{const {client,user}=await requirePortalUser(request);const body=await request.json().catch(()=>null) as {id?:unknown}|null;if(!body||typeof body.id!=='string')return Response.json({error:'Choose a notification.'},{status:400});
 const result=await client.from('portal_notifications').update({read_at:new Date().toISOString()}).eq('id',body.id).eq('user_id',user.id).select('id').maybeSingle();if(result.error)throw result.error;if(!result.data)return Response.json({error:'Notification not found.'},{status:404});return Response.json({saved:true});
 }catch(error){return authErrorResponse(error);}
}
