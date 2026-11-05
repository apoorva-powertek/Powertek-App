import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createSurveyDatabase} from './survey-fixture.mjs';import {adminId as admin,staffId as staff,clientId as client} from './permission-fixture.mjs';
const db=await createSurveyDatabase();for(const name of ['20261104090000_project_workflow_and_notifications','20261104091000_gate_existing_project_updates','20261105090000_project_photo_availability'])await db.exec(await readFile(new URL('../supabase/migrations/'+name+'.sql',import.meta.url),'utf8'));
async function asUser(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated`);}
const photos=async(project='p1')=>(await db.query('select public.project_photo_availability($1) as photos',[project])).rows[0].photos;
await asUser(admin);await db.query(`select public.save_portal_access('staff@example.com','Staff','staff',false,'[{"projectId":"p1","canUpload":true}]')`);await db.query(`select public.save_portal_access('client@example.com','Client','client',false,'[{"projectId":"p1"}]')`);
test('photo names and stale keys do not claim that original bytes exist',async()=>{
 await asUser(client);assert.equal((await photos()).find(p=>p.pole_id==='pole1').available,false);
 await asUser(staff);await db.query("update public.poles set image_key='p1/image/photo.jpg',image_filename='photo.jpg' where id='pole1'");assert.equal((await photos()).find(p=>p.pole_id==='pole1').available,false);
});
test('storage availability is scoped to the authorized project and rejects cross-project keys',async()=>{
 await db.exec('reset role');await db.query("insert into storage.objects(id,bucket_id,name,metadata) values('foreign-image','project-files','p2/image/photo.jpg','{\"size\":5}')");await asUser(staff);await db.query("update public.poles set image_key='p2/image/photo.jpg' where id='pole1'");assert.equal((await photos())[0].available,false);
 await assert.rejects(()=>photos('p2'),/access required/);await asUser(client);await assert.rejects(()=>photos(),/access required/);
});
test('restored originals become available while measurements survive the photo replacement',async()=>{
 await db.exec('reset role');await db.query("insert into storage.objects(id,bucket_id,name,metadata) values('own-image','project-files','p1/image/photo.jpg','{\"size\":5}')");await asUser(staff);const before=(await db.query("select * from public.attachments where pole_id='pole1'")).rows;await db.query("update public.poles set image_key='p1/image/photo.jpg' where id='pole1'");assert.equal((await photos())[0].available,true);assert.deepEqual((await db.query("select * from public.attachments where pole_id='pole1'")).rows,before);
 await asUser(admin);assert.equal((await photos())[0].available,true);
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon");await assert.rejects(()=>photos());
});
test.after(()=>db.close());
