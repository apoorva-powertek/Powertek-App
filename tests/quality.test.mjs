// Isolated PostgreSQL execution; never connects to the live database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPermissionDatabase,adminId as admin,staffId as staff,clientId as client} from "./permission-fixture.mjs";
const db=await createPermissionDatabase();
await db.exec(`
alter table public.projects add column description text default '';
alter table storage.objects add column metadata jsonb;
alter table public.poles add column pole_name text,add column normalized_name text,add column latitude float8,add column longitude float8,add column elevation_m float8,add column top_height_m float8,add column pole_height_ft float8,add column pole_class text,add column status text default 'location_only',add column image_key text,add column image_filename text,add column image_width bigint,add column image_height bigint,add column source_json_filename text,add column model_version text,add column tool_name text,add column base_x float8,add column base_y float8,add column top_x float8,add column top_y float8,add column raw_json text,add unique(project_id,pole_name);
alter table public.attachments add column name text not null default 'Fixture',add column height_m float8 not null default 1,add column photo_x float8,add column photo_y float8,add column side text not null default 'right',add column color text,add column kind text not null default 'attachment',add column sort_order bigint not null default 0;
alter table public.project_files add column pole_id text,add column kind text,add column object_key text,add column filename text,add column content_type text,add column size_bytes bigint;
update public.poles set pole_name=id,normalized_name=upper(id),latitude=1,longitude=2,elevation_m=3;
`);
await db.exec(await readFile(new URL('../supabase/migrations/20261022090000_survey_quality_workflow.sql',import.meta.url),'utf8'));
async function asUser(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);}
await asUser(admin);await db.query(`select public.save_portal_access('staff@example.com','Staff','staff',false,'[{"projectId":"p1","canUpload":true}]')`);
await db.query(`select public.save_portal_access('client@example.com','Client','client',false,'[{"projectId":"p1"}]')`);
const pole={poleName:'NEW-1',latitude:30,longitude:-90,elevationM:15,attachments:[{name:'Primary',heightM:8}]};
let seq=1;
async function prepare(poles=[pole],fileSize=5){
 const id=`20000000-0000-4000-8000-${String(seq++).padStart(12,'0')}`;
 const files=[{name:'source.csv',kind:'spreadsheet',size:fileSize,type:'text/csv',objectKey:`p1/imports/${id}/source.csv`},{name:'NEW-1.jpg',kind:'image',size:5,type:'image/jpeg',poleName:'NEW-1',objectKey:`p1/imports/${id}/NEW-1.jpg`}];
 await db.query('select public.prepare_survey_import($1,\'p1\',\'source.csv\',$2::jsonb,$3::jsonb)',[id,JSON.stringify(poles),JSON.stringify(files)]);
 return {id,files};
}
async function upload(batch){await db.exec('reset role');for(const f of batch.files)await db.query('insert into storage.objects(id,bucket_id,name,metadata) values($1,\'project-files\',$2,$3)',[f.objectKey,f.objectKey,JSON.stringify({size:f.size})]);await asUser(admin);}
async function commit(id){return (await db.query('select public.commit_survey_import($1) as result',[id])).rows[0].result;}
async function getPole(){return (await db.query("select * from public.poles where pole_name='NEW-1'")).rows[0];}
async function transition(stage,note=''){const p=await getPole();return db.query('select public.transition_survey_review($1,$2,$3,$4)',[p.id,stage,p.updated_at,note]);}

test('migration preserves legacy data and never claims previous approval',async()=>{
 await asUser(admin);assert.equal((await db.query("select review_stage from public.poles where id='pole1'")).rows[0].review_stage,'uploaded');
});
test('nothing is published until every source object is present and has the expected size',async()=>{
 await asUser(admin);const batch=await prepare();await assert.rejects(()=>commit(batch.id),/missing/);assert.equal(await getPole(),undefined);
 await upload(batch);await asUser(client);assert.equal((await db.query('select * from storage.objects where name=$1',[batch.files[0].objectKey])).rows.length,0);await asUser(admin);await db.query("update storage.objects set metadata='{\"size\":1}' where name=$1",[batch.files[0].objectKey]);await assert.rejects(()=>commit(batch.id),/missing/);
 await db.query("update storage.objects set metadata='{\"size\":5}' where name=$1",[batch.files[0].objectKey]);const result=await commit(batch.id);assert.equal(result.importedPoles,1);assert.equal(result.importedAttachments,1);
 assert.equal((await getPole()).review_stage,'uploaded');assert.ok((await getPole()).image_key);
 const firstId=(await getPole()).id;assert.equal((await commit(batch.id)).alreadyCompleted,true);assert.equal((await getPole()).id,firstId);
 assert.equal((await db.query('select * from public.project_files where object_key=$1',[batch.files[0].objectKey])).rows.length,1);
 assert.equal((await db.query("update storage.objects set metadata='{\"size\":1}' where name=$1 returning id",[batch.files[0].objectKey])).rows.length,0);
 assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[batch.files[0].objectKey])).rows.length,0);
 await asUser(client);assert.equal((await db.query('select * from storage.objects where name=$1',[batch.files[0].objectKey])).rows.length,1);await asUser(admin);
});
test('all metadata rolls back if a later attachment fails validation',async()=>{
 await asUser(admin);const old=await getPole();const batch=await prepare([{...pole,latitude:33},{...pole,poleName:'BAD',attachments:[{name:'Bad',heightM:-1}]}]);await upload(batch);
 await assert.rejects(()=>commit(batch.id),/height/);assert.equal((await getPole()).latitude,old.latitude);assert.equal((await db.query("select * from public.poles where pole_name='BAD'")).rows.length,0);
});
test('review enforces sequence, administrator approval, optimistic concurrency and completeness',async()=>{
 await asUser(admin);await assert.rejects(()=>transition('approved'),/transition/);await transition('needs_review');
 const old=await getPole();await asUser(staff);await assert.rejects(()=>transition('approved'),/Administrator/);
 await assert.rejects(()=>db.query("update public.poles set review_stage='approved' where id=$1",[old.id]),/Administrator/);
 await asUser(admin);await transition('approved');
 await assert.rejects(()=>db.query("select public.transition_survey_review($1,'delivered','2000-01-01','')",[old.id]),/Refresh/);
 await transition('delivered');assert.equal((await getPole()).review_stage,'delivered');
 await assert.rejects(()=>transition('uploaded'),/reason/);await transition('uploaded','Needs a corrected measurement');
 await db.query('update public.poles set image_key=null where id=$1',[old.id]);await transition('needs_review');await assert.rejects(()=>transition('approved'),/photo/);
});
test('editing survey or attachments invalidates review even through direct database API',async()=>{
 await asUser(admin);const p=await getPole();await db.query("update public.poles set image_key=(select object_key from public.project_files where kind='image' limit 1) where id=$1",[p.id]);await transition('needs_review');await transition('approved');
 await asUser(staff);await db.query('update public.attachments set height_m=9 where pole_id=$1',[p.id]);assert.equal((await getPole()).review_stage,'uploaded');
 await transition('needs_review');await asUser(admin);await transition('approved');
 await asUser(staff);await db.query('update public.poles set latitude=31 where id=$1',[p.id]);assert.equal((await getPole()).review_stage,'uploaded');
});
test('re-import preserves IDs, replaces attachments, resets approval and rejects stale packages',async()=>{
 await asUser(admin);const old=await getPole();await transition('needs_review');await transition('approved');
 const batch=await prepare([{...pole,attachments:[{name:'Neutral',heightM:6}]}]);await upload(batch);await commit(batch.id);
 const p=await getPole();assert.equal(p.id,old.id);assert.equal(p.review_stage,'uploaded');assert.deepEqual((await db.query('select name from public.attachments where pole_id=$1',[p.id])).rows.map(a=>a.name),['Neutral']);
 const stale=await prepare();await upload(stale);await db.query("select public.save_portal_project('p1','c1','Updated project','P1','','active')");await assert.rejects(()=>commit(stale.id),/changed since validation/);
});
test('audit history is immutable and private; clients cannot publish or review',async()=>{
 await asUser(admin);const events=(await db.query('select * from public.audit_events')).rows;assert.ok(events.some(e=>e.action==='import_completed'));assert.ok(events.some(e=>e.action==='review_changed'&&e.details.note));
 await assert.rejects(()=>db.query('delete from public.audit_events'));await assert.rejects(()=>db.query("insert into public.audit_events(actor_name,entity_type,entity_id,action) values('Forged','survey','x','approved')"));
 await asUser(client);assert.equal((await db.query('select * from public.audit_events')).rows.length,0);await assert.rejects(()=>prepare());await assert.rejects(()=>transition('needs_review'));
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");await assert.rejects(()=>db.query('select * from public.audit_events'));
});
test.after(()=>db.close());

test('HTTP import and review handlers validate input and commit through the actual database functions',async()=>{
 const {build}=await import('../node_modules/.pnpm/node_modules/esbuild/lib/main.js');
 const harness={actor:admin,role:'admin'};
 const access=async(project)=>{if(harness.role==='client'||project!=='p1')throw Object.assign(new Error('Project upload permission required'),{status:403});await asUser(harness.actor);return {client:apiClient,user:{role:harness.role}};};
 const args={prepare_survey_import:['p_id','p_project_id','p_source_name','p_poles','p_files'],commit_survey_import:['p_id'],transition_survey_review:['p_pole_id','p_stage','p_expected_updated_at','p_note']};
 const apiClient={
  from(table){const conditions=[],values=[];const chain={select(){return chain;},eq(key,value){conditions.push(`${key}=$${values.push(value)}`);return chain;},async maybeSingle(){try{await asUser(harness.actor);const result=await db.query(`select * from public.${table} where ${conditions.join(' and ')}`,values);return {data:result.rows[0]??null,error:null};}catch(error){return {data:null,error};}}};return chain;},
  async rpc(name,input){try{await asUser(harness.actor);const result=await db.query(`select public.${name}(${args[name].map((_,i)=>'$'+(i+1)).join(',')}) as result`,args[name].map(key=>typeof input[key]==='object'?JSON.stringify(input[key]):input[key]));return {data:result.rows[0].result,error:null};}catch(error){return {data:null,error};}}
 };
 globalThis.__powertekQualityHarness={access};
 async function route(path){const result=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'auth-boundary',setup(build){build.onResolve({filter:/^@\/lib\/supabase$/},()=>({path:'auth',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const requireProjectEditor=(_request,project)=>globalThis.__powertekQualityHarness.access(project);export const authErrorResponse=error=>Response.json({error:error.message},{status:error.status??503});`,loader:'js'}));}}]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
 const importer=await route('app/api/projects/[projectId]/import/route.ts'),review=await route('app/api/projects/[projectId]/review/route.ts');
 const context={params:Promise.resolve({projectId:'p1'})};
 const post=(handler,body,ctx=context)=>handler.POST(new Request('https://example.test/api',{method:'POST',headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)}),ctx);
 assert.equal((await post(importer,'not json')).status,400);
 assert.equal((await post(importer,{action:'prepare',id:'bad'})).status,400);
 const id='30000000-0000-4000-8000-000000000001',files=[{name:'source.csv',kind:'spreadsheet',size:5,type:'text/csv',objectKey:`p1/imports/${id}/source.csv`}];
 assert.equal((await post(importer,{action:'prepare',id,poles:[{...pole,latitude:null}],files,sourceName:'source.csv'})).status,400);
 const prepared=await post(importer,{action:'prepare',id,poles:[pole],files,sourceName:'source.csv'});assert.equal(prepared.status,200);
 assert.equal((await post(importer,{action:'commit',id})).status,400);
 await upload({id,files});
 assert.equal((await post(importer,{action:'commit',id})).status,200);
 assert.equal((await post(importer,{action:'commit',id})).status,200);
 harness.role='client';harness.actor=client;assert.equal((await post(importer,{action:'commit',id})).status,403);
 harness.role='admin';harness.actor=admin;
 const p=await getPole();assert.equal((await post(review,{poleId:p.id,stage:'needs_review',expectedUpdatedAt:p.updated_at,note:'HTTP review'})).status,200);
 assert.equal((await post(review,{poleId:p.id,stage:'approved',expectedUpdatedAt:'2000-01-01T00:00:00Z',note:''})).status,409);
 assert.equal((await post(review,{poleId:'missing',stage:'needs_review',expectedUpdatedAt:p.updated_at})).status,404);
 delete globalThis.__powertekQualityHarness;
});
