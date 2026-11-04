import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createSurveyDatabase} from './survey-fixture.mjs';import {adminId as admin,staffId as staff,clientId as client} from './permission-fixture.mjs';
const db=await createSurveyDatabase();await db.exec(await readFile(new URL('../supabase/migrations/20261104090000_project_workflow_and_notifications.sql',import.meta.url),'utf8'));
async function asUser(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);}
await asUser(admin);await db.query(`select public.save_portal_access('staff@example.com','Staff','staff',false,'[{"projectId":"p1","canUpload":true}]')`);await db.query(`select public.save_portal_access('client@example.com','Client','client',false,'[{"projectId":"p1"}]')`);
let projectId;const releaseId='50000000-0000-4000-8000-000000000001';
async function action(name,ids=[],message=''){const p=(await db.query('select updated_at from public.projects where id=$1',[projectId])).rows[0];return db.query('select public.advance_project_workflow($1,$2,$3,$4,$5,$6) as result',[projectId,name,p?.updated_at??'2000-01-01',releaseId,ids,message]);}
test('staff creates a project within an authorized client and receives edit access atomically',async()=>{
 await asUser(staff);projectId=(await db.query("select public.save_portal_project(null,'c1','Employee project','STAFF-WORK','','active') as id")).rows[0].id;
 assert.ok(projectId);assert.equal((await db.query('select can_upload from public.user_projects where project_id=$1',[projectId])).rows[0].can_upload,true);
 assert.equal((await db.query('select requires_approval from public.projects where id=$1',[projectId])).rows[0].requires_approval,true);
 await assert.rejects(()=>db.query("select public.save_portal_project(null,'c2','Wrong client','FORBIDDEN','','active')"),/creation requires/);
 await assert.rejects(()=>db.query("select public.save_portal_project($1,'c2','Moved','MOVED','','active')",[projectId]),/ownership/);
 await assert.rejects(()=>db.query("select public.save_portal_project($1,'c1','Archived','STAFF-WORK','','archived')",[projectId]),/archive/);
 await db.query("select public.save_portal_project($1,'c1','Updated employee project','STAFF-WORK','New location','active')",[projectId]);
});
test('client cannot create projects and new working data stays private even when assigned',async()=>{
 await asUser(admin);await db.query('select public.save_portal_access($1,$2,$3,false,$4)', ['client@example.com','Client','client',JSON.stringify([{projectId:'p1'},{projectId}])]);
 await asUser(client);await assert.rejects(()=>db.query("select public.save_portal_project(null,'c1','Client create','FORBIDDEN','','active')"));
 assert.equal((await db.query('select * from public.projects where id=$1',[projectId])).rows.length,0);
 const feed=(await db.query('select public.list_client_projects() as feed')).rows[0].feed;assert.equal(feed.find(p=>p.id===projectId).can_view,false);
 assert.equal((await db.query("select * from public.projects where id='p1'")).rows.length,1,'legacy access is preserved');
});
test('employees upload records and request review without administrator database work',async()=>{
 await asUser(staff);await assert.rejects(()=>action('submit'),/Upload project records/);
 await db.query("insert into public.poles(id,project_id,pole_name,normalized_name,latitude,longitude,elevation_m,status,review_stage) values('workflow-pole',$1,'WF-1','WF1',1,1,1,'complete','uploaded')",[projectId]);
 await db.query("insert into public.attachments(id,pole_id,name,height_m) values('workflow-attachment','workflow-pole','Neutral',5)");
 await action('submit');assert.equal((await db.query("select review_stage from public.poles where id='workflow-pole'")).rows[0].review_stage,'needs_review');
 await assert.rejects(()=>action('approve'),/Administrator/);await assert.rejects(()=>action('release',['client']),/Administrator/);
 await asUser(admin);assert.equal((await db.query("select * from public.portal_notifications where title='Project ready for review'")).rows.length,1);
 await assert.rejects(()=>action('approve'),/photo/);
});
test('administrator approval and release require real data and produce one client notification',async()=>{
 await asUser(staff);const key=projectId+'/image/WF-1.png';await db.query("insert into storage.objects(id,bucket_id,name,metadata) values('workflow-image','project-files',$1,'{\"size\":5}')",[key]);
 await db.query("update public.poles set image_key=$1,image_filename='WF-1.png' where id='workflow-pole'",[key]);await action('submit');
 await asUser(admin);await action('approve');assert.equal((await db.query("select review_stage from public.poles where id='workflow-pole'")).rows[0].review_stage,'approved');
 await assert.rejects(()=>action('release',['staff']),/client accounts/);
 await action('release',['client'],'Please review and download the updated survey.');
 assert.ok((await db.query('select published_at from public.projects where id=$1',[projectId])).rows[0].published_at);
 assert.equal((await db.query('select * from public.project_releases where id=$1',[releaseId])).rows.length,1);
 const repeated=await action('release',['client'],'Please review and download the updated survey.');assert.equal(repeated.rows[0].result.alreadyCompleted,true);
 assert.equal((await db.query('select * from public.portal_notifications where release_id=$1',[releaseId])).rows.length,0,'administrator cannot read another person’s inbox');
});
test('clients can view released data and mark only their own notifications as read',async()=>{
 await asUser(client);assert.equal((await db.query('select * from public.projects where id=$1',[projectId])).rows.length,1);
 assert.equal((await db.query("select * from public.poles where id='workflow-pole'")).rows.length,1);
 assert.equal((await db.query("select * from storage.objects where id='workflow-image'")).rows.length,1);
 const notification=(await db.query('select * from public.portal_notifications where release_id=$1',[releaseId])).rows[0];assert.ok(notification);assert.match(notification.message,/download/);
 await db.query('update public.portal_notifications set read_at=now() where id=$1',[notification.id]);assert.ok((await db.query('select read_at from public.portal_notifications where id=$1',[notification.id])).rows[0].read_at);
 await assert.rejects(()=>db.query("update public.portal_notifications set title='Forged' where id=$1",[notification.id]));
 await assert.rejects(()=>db.query("insert into public.portal_notifications(user_id,project_id,title) values('client',$1,'Forged')",[projectId]));
 assert.equal((await db.query("update public.portal_notifications set read_at=now() where user_id='admin' returning id")).rows.length,0);
});
test('editing a released project withdraws client access until the next approval and release',async()=>{
 await asUser(staff);await db.query("update public.poles set latitude=1.1 where id='workflow-pole'");assert.equal((await db.query('select published_at from public.projects where id=$1',[projectId])).rows[0].published_at,null);
 await asUser(client);assert.equal((await db.query("select * from public.poles where id='workflow-pole'")).rows.length,0);assert.equal((await db.query("select * from storage.objects where id='workflow-image'")).rows.length,0);
 const feed=(await db.query('select public.list_client_projects() as feed')).rows[0].feed;assert.equal(feed.find(p=>p.id===projectId).can_view,false);
 await assert.rejects(()=>db.query('select public.project_workflow_context($1)',[projectId]));
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");await assert.rejects(()=>db.query('select * from public.portal_notifications'));
});
test.after(()=>db.close());

test('workflow HTTP boundary rejects malformed requests, role escalation and stale versions through actual RPCs',async()=>{
 const {build}=await import('../node_modules/.pnpm/node_modules/esbuild/lib/main.js');
 const harness={actor:staff,role:'staff'};
 const names=['p_project_id','p_action','p_expected_updated_at','p_request_id','p_recipient_ids','p_message'];
 const apiClient={async rpc(name,input){try{await asUser(harness.actor);const keys=name==='project_workflow_context'?['p_project_id']:names;const result=await db.query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as result`,keys.map(k=>input[k]));return {data:result.rows[0].result,error:null};}catch(error){return {data:null,error};}}};
 globalThis.__workflowHarness=async(id)=>{if(harness.role==='client'||id!==projectId)throw Object.assign(new Error('Project edit permission required'),{status:403});return {client:apiClient};};
 const bundle=await build({entryPoints:['app/api/projects/[projectId]/workflow/route.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'test-auth',setup(b){b.onResolve({filter:/^@\/lib\/supabase$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const requireProjectEditor=(_request,id)=>globalThis.__workflowHarness(id);export const authErrorResponse=e=>Response.json({error:e.message},{status:e.status??503});`,loader:'js'}));}}]});
 const handler=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const context={params:Promise.resolve({projectId})};
 const get=()=>handler.GET(new Request('https://example.test/api'),context);
 const post=body=>handler.POST(new Request('https://example.test/api',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),context);
 assert.equal((await post({})).status,400);
 const current=await (await get()).json();assert.equal(current.admin,false);assert.equal(current.counts.uploaded,1);
 const body={action:'submit',expectedUpdatedAt:current.project.updatedAt,requestId:'60000000-0000-4000-8000-000000000001',recipientIds:[],message:''};
 assert.equal((await post({...body,requestId:'------------------------------------'})).status,400);
 assert.equal((await post({...body,message:'x'.repeat(1001)})).status,400);
 assert.equal((await post({...body,expectedUpdatedAt:'2000-01-01T00:00:00Z'})).status,409);
 assert.equal((await post({...body,action:'approve'})).status,403);
 assert.equal((await post(body)).status,200);
 harness.actor=client;harness.role='client';assert.equal((await get()).status,403);assert.equal((await post(body)).status,403);
 harness.actor=admin;harness.role='admin';const refreshed=await (await get()).json();assert.equal((await post({...body,action:'approve',expectedUpdatedAt:refreshed.project.updatedAt})).status,200);
 const approved=await (await get()).json();assert.equal((await post({...body,action:'release',expectedUpdatedAt:approved.project.updatedAt,recipientIds:['client']})).status,200);
 await asUser(staff);await db.query("insert into public.project_files(id,project_id,kind,object_key,filename,size_bytes) values('later-file',$1,'json',$2,'extra.json',5)",[projectId,projectId+'/json/extra.json']);
 assert.equal((await db.query('select published_at from public.projects where id=$1',[projectId])).rows[0].published_at,null,'source-file additions also withdraw a release');
 delete globalThis.__workflowHarness;
});
