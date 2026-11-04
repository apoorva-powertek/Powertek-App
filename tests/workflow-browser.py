"""Employee upload → administrator approval → client inbox/download, mocked writes."""
from browser_fixtures import *
from playwright.sync_api import expect
import io,zipfile
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=')
state={'project':None,'poles':[],'files':[],'prepared':None,'stage':'uploaded','published':False,'assigned':False,'notifications':[],'actions':[],'imports':[]}
clients=[dict(id='client-one',name='Northline Utilities',code='NLU',status='active',project_count=1,can_create_project=True)]
def configure(context,role):
 setup(context,role)
 def fulfill(route,data,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
 def dashboard(route):
  rows=[dict(PROJECTS[0])]
  if state['project']:
   project=dict(state['project']);project.update(pole_count=len(state['poles']),complete_count=len(state['poles']),attachment_count=1 if state['poles'] else 0,can_upload=role!='client',can_view=state['published'] if role=='client' else True,review_counts={state['stage']:len(state['poles'])},published_at='2026-11-04T12:00:00Z' if state['published'] else None)
   if role!='client' or state['assigned']:rows.append(project)
  user=dict(id='test-user',email='test@example.com',displayName='Alex Morgan',authUserId='10000000-0000-4000-8000-000000000001',role=role,status='active',permissions={'manageClients':False})
  fulfill(route,dict(user=user,projects=rows,clients=clients if role!='client' else [],users=[],notifications=state['notifications'] if role=='client' else []))
 context.route('**/api/dashboard',dashboard)
 def create(route):
  body=route.request.post_data_json;assert body['clientId']=='client-one'
  state['project']=dict(id='employee-project',client_id='client-one',client_name='Northline Utilities',name=body['name'],code='EMPLOYEE-SURVEY',location_label=body.get('locationLabel',''),status='active',description='',created_at='2026-11-04T12:00:00Z',updated_at='2026-11-04T12:00:00Z',pole_count=0,complete_count=0,attachment_count=0,can_upload=True)
  fulfill(route,{'id':'employee-project'},201)
 context.route('**/api/admin/projects',create)
 def poles(route):
  project=state['project'] or PROJECTS[0]
  rows=[]
  for p in state['poles']:
   rows.append(dict(id='employee-pole',projectId='employee-project',status='complete',reviewStage=state['stage'],updatedAt='2026-11-04T12:00:00Z',poleClass=None,topHeightM=None,poleHeightFt=None,imageWidth=1,imageHeight=1,sourceJsonFilename='P-1.json',modelVersion=None,toolName=None,baseX=None,baseY=None,topX=None,topY=None)|p)
  fulfill(route,dict(project={**project,'client_code':'NLU'},canEdit=role!='client',poles=rows))
 context.route('**/api/projects/employee-project/poles',poles)
 def upload(route):
  body=route.request.post_data_json
  if body['action']=='prepare':
   state['prepared']=body;state['imports'].append(body);fulfill(route,{'id':body['id']})
  else:
   pack=state['prepared'];state['poles']=pack['poles'];state['stage']='uploaded';state['published']=False
   state['files']=[dict(id=f'file-{i}',filename=f['name'],kind=f['kind'],object_key=f['objectKey'],size_bytes=f['size'],created_at='2026-11-04T12:00:00Z') for i,f in enumerate(pack['files'])]
   fulfill(route,{'importedPoles':len(pack['poles']),'importedAttachments':1})
 context.route('**/api/projects/employee-project/import',upload)
 def storage(route):
  if route.request.method=='POST':fulfill(route,{'Key':'synthetic'})
  else:route.fulfill(status=200,content_type='image/png' if route.request.url.endswith('.png') else 'text/csv',body=PNG if route.request.url.endswith('.png') else b'name,latitude,longitude,elevation\nP-1,30,-90,15\n')
 context.route('**/storage/v1/object/**',storage)
 context.route('**/api/projects/employee-project/poles/employee-pole/image',lambda r:r.fulfill(status=200,content_type='image/png',body=PNG))
 def workflow(route):
  if route.request.method=='POST':
   b=route.request.post_data_json;state['actions'].append((role,b))
   if b['action']!='submit':assert role=='admin'
   if b['action']=='submit':state['stage']='needs_review'
   elif b['action']=='approve':state['stage']='approved'
   else:
    assert state['stage']=='approved' and b['recipientIds']==['client-person']
    state['stage']='delivered';state['published']=True;state['assigned']=True
    state['notifications']=[dict(id='notice-one',project_id='employee-project',title='Project ready to view and download',message=state['project']['name']+'\n'+b['message'],created_at='2026-11-04T12:00:00Z',read_at=None)]
   fulfill(route,{'saved':True});return
  fulfill(route,dict(project=dict(id='employee-project',name=state['project']['name'],updatedAt='2026-11-04T12:00:00Z',publishedAt='2026-11-04T12:00:00Z' if state['published'] else None,status='active'),counts=dict(total=len(state['poles']),uploaded=len(state['poles']) if state['stage']=='uploaded' else 0,needsReview=len(state['poles']) if state['stage']=='needs_review' else 0,approved=len(state['poles']) if state['stage'] in ['approved','delivered'] else 0,missingPhotos=0,missingMeasurements=0),recipients=[dict(id='client-person',name='Jordan Chen',email='client@example.com')],admin=role=='admin'))
 context.route('**/api/projects/employee-project/workflow',workflow)
 context.route('**/api/projects/employee-project/files?*',lambda r:fulfill(r,dict(files=state['files'],total=len(state['files']),nextOffset=None)))
 context.route('**/api/notifications',lambda r:(state['notifications'][0].update(read_at='2026-11-04T12:01:00Z'),fulfill(r,{'saved':True}))[-1])
 context.route('**/api/activity**',lambda r:fulfill(r,{'events':[],'next':None}))
 context.route('**/*.arcgisonline.com/**',lambda r:r.abort())

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 staff=browser.new_context(viewport=dict(width=1440,height=1000));configure(staff,'staff')
 page=staff.new_page();page.goto(BASE_URL+'/portal');page.get_by_role('button',name='New project',exact=True).click()
 form=page.get_by_role('form',name='Create project',exact=True);form.get_by_label('Client',exact=True).select_option('client-one');form.get_by_label('Project name',exact=True).fill('Employee survey package')
 assert page.get_by_label('Project workflow',exact=True).count()==1
 form.get_by_role('button',name='Create project',exact=True).click();page.get_by_role('heading',name='Upload data',exact=True).wait_for()
 expect(page.get_by_label('Destination project',exact=True)).to_have_value('employee-project')
 package=io.BytesIO()
 with zipfile.ZipFile(package,'w') as z:
  z.writestr('locations.csv','name,latitude,longitude,elevation\nP-1,30,-90,15\n')
  z.writestr('P-1.json',json.dumps(dict(pole_id='P-1',attachments=[dict(name='Neutral',height_m=5)])))
  z.writestr('P-1.png',PNG)
 page.get_by_label('Complete survey package',exact=True).set_input_files(dict(name='survey.zip',mimeType='application/zip',buffer=package.getvalue()))
 page.get_by_role('button',name='Validate and preview',exact=True).click();page.get_by_role('heading',name='Review your package',exact=True).wait_for()
 page.get_by_role('tab',name='Photos (1)',exact=True).click();expect(page.get_by_role('img',name='Preview of P-1.png',exact=True)).to_be_visible()
 page.get_by_role('tab',name='Files (3)',exact=True).click();expect(page.get_by_label('Source files preview',exact=True)).to_contain_text('P-1.json')
 for width in [320,375,768,1440]:page.set_viewport_size(dict(width=width,height=1000));no_overflow(page)
 page.set_viewport_size(dict(width=1440,height=1000));page.locator('h1').focus();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'employee-package-preview.png'),full_page=True)
 page.get_by_role('button',name='Confirm and upload',exact=True).click();page.get_by_role('link',name='Open project and review surveys',exact=True).click()
 page.get_by_role('button',name='Review & client access',exact=True).click()
 dialog=page.get_by_role('dialog',name='Employee survey package',exact=True)
 assert dialog.get_by_role('button',name='Approve project',exact=True).count()==0
 dialog.get_by_role('button',name='Submit project for review',exact=True).click();expect(dialog.get_by_role('status')).to_contain_text('administrator review')
 dialog.get_by_role('button',name='Close dialog',exact=True).click()
 admin=browser.new_context();configure(admin,'admin');a=admin.new_page();a.goto(BASE_URL+'/admin?tab=projects')
 a.locator('.project-card-wrapper').filter(has_text='Employee survey package').get_by_role('button',name='Review & client access',exact=True).click()
 dialog=a.get_by_role('dialog',name='Employee survey package',exact=True)
 expect(dialog.get_by_role('button',name='Release and notify clients',exact=True)).to_be_disabled()
 dialog.get_by_label('I have reviewed the project records and measurements.',exact=True).check();dialog.get_by_role('button',name='Approve project',exact=True).click()
 expect(dialog.get_by_role('status')).to_contain_text('Project approved')
 assert not state['notifications']
 dialog.get_by_label('Jordan Chen',exact=False).check();dialog.get_by_label('Message to client',exact=False).fill('Please check and download the approved project.')
 dialog.get_by_role('button',name='Release and notify clients',exact=True).click();expect(dialog.get_by_role('status')).to_contain_text('in-app notification')
 client=browser.new_context(viewport=dict(width=375,height=950));configure(client,'client');c=client.new_page();c.goto(BASE_URL+'/portal');c.get_by_role('heading',name='Workspace overview',exact=True).wait_for()
 c.get_by_role('button',name='Notifications, 1 unread',exact=True).click();inbox=c.get_by_role('dialog',name='Notifications',exact=True)
 expect(inbox).to_contain_text('Project ready to view and download');no_overflow(c)
 inbox.get_by_role('button',name='View project',exact=True).click();c.get_by_role('button',name='Project files',exact=True).click()
 c.get_by_role('heading',name='View and download project files',exact=True).wait_for()
 with c.expect_download() as downloaded:c.get_by_role('button',name='Download locations.csv',exact=True).click()
 assert downloaded.value.suggested_filename=='locations.csv';assert state['notifications'][0]['read_at']
 with c.expect_download() as packaged:c.get_by_role('button',name='Download project package',exact=True).click()
 assert packaged.value.suggested_filename=='project-files.zip'
 with zipfile.ZipFile(packaged.value.path()) as archive:assert len(archive.namelist())==3
 # Add just a new matching photo without resending a location spreadsheet.
 page.goto(BASE_URL+'/portal?tab=import&project=employee-project')
 page.get_by_label('Original photos',exact=True).set_input_files(dict(name='P-1.png',mimeType='image/png',buffer=PNG))
 page.get_by_role('button',name='Validate and preview',exact=True).click();page.get_by_role('heading',name='Review your package',exact=True).wait_for()
 page.get_by_role('button',name='Confirm and upload',exact=True).click();page.get_by_role('link',name='Open project and review surveys',exact=True).wait_for()
 assert state['imports'][-1]['sourceName']=='Additional survey files'
 assert state['imports'][-1]['poles'][0]['attachments'][0]['heightM']==5
 assert not state['published']
 c.goto(BASE_URL+'/portal?tab=projects');c.get_by_role('heading',name='Projects',exact=True).wait_for()
 expect(c.locator('.project-card-wrapper').filter(has_text='Employee survey package')).to_contain_text('under administrator review')
 assert c.locator('.workspace-project-card[aria-disabled=true]').count()==1;no_overflow(c)
 staff.close();admin.close();client.close();browser.close()
 print('Workflow browser checks passed: employee project creation, ZIP discovery, record/photo/file preview, upload, review submission, admin approval, in-app client notification and source download, photo-only additions, and unpublished update visibility. All writes intercepted; no emails sent.')
