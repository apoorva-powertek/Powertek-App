"""Survey import/review UI with synthetic auth, storage, and API responses only."""
from browser_fixtures import *
from playwright.sync_api import expect

def configure(context, role="admin"):
 setup(context,role)
 state={"stage":"uploaded","updated":0,"files":[],"prepared":None,"failed":False,"commits":0,"reviews":[],"activity":[]}
 pole=dict(id="pole-one",projectId="project-one",poleName="P-1",latitude=30,longitude=-90,elevationM=15,topHeightM=10,poleHeightFt=40,poleClass="3",status="complete",imageFilename=None,imageWidth=None,imageHeight=None,sourceJsonFilename=None,modelVersion=None,toolName=None,baseX=None,baseY=None,topX=None,topY=None,attachments=[dict(id="a",name="Primary",heightM=8,photoX=None,photoY=None,side="right",color=None,kind="wire",sortOrder=0)])
 def poles(route):
  route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(project={**PROJECTS[0],"client_code":"NORTH"},canEdit=role in ["admin","staff"],poles=[{**pole,"reviewStage":state["stage"],"updatedAt":f"2026-10-22T12:00:0{state['updated']}Z"}])))
 context.route("**/api/projects/project-one/poles",poles)
 def storage(route):
  if route.request.method=="POST":
   if route.request.url.endswith('.jpg') and not state['failed']:
    state['failed']=True;route.fulfill(status=500,content_type="application/json",body=json.dumps({"statusCode":"500","error":"Interrupted","message":"Connection interrupted"}));return
   state["files"].append(route.request.url)
  route.fulfill(status=200,content_type="application/json",body=json.dumps({"Key":"synthetic"}))
 context.route("**/storage/v1/object/project-files/**",storage)
 def importer(route):
  body=route.request.post_data_json
  if body["action"]=="prepare":
   if state["prepared"]: assert state["prepared"]==body
   state["prepared"]=body
   result={"id":body["id"],"status":"pending"}
  else:
   assert len(state["files"])==len(state["prepared"]["files"])
   state["commits"]+=1;result={"importedPoles":len(state["prepared"]["poles"]),"importedAttachments":1}
  route.fulfill(status=200,content_type="application/json",body=json.dumps(result))
 context.route("**/api/projects/project-one/import",importer)
 def review(route):
  body=route.request.post_data_json;state['reviews'].append(body)
  old=state['stage'];state['stage']=body['stage'];state['updated']+=1
  state['activity'].insert(0,dict(id=state['updated'],occurred_at="2026-10-22T12:00:00Z",actor_name="Alex Morgan",entity_type="survey",entity_id="pole-one",action="review_changed",details=dict(pole="P-1",**{"from":old,"to":body['stage']},note=body['note'])))
  route.fulfill(status=200,content_type="application/json",body='{"saved":true}')
 context.route("**/api/projects/project-one/review",review)
 context.route("**/api/activity**",lambda route:route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(events=state['activity'],next=None))))
 # Prevent map requests from using external services during the fixture test.
 context.route("**/*.arcgisonline.com/**",lambda route:route.abort())
 return state

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox"])
 context=browser.new_context(viewport={"width":1440,"height":1000});state=configure(context)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE_URL+"/admin");page.get_by_role('heading',name='A clearer view of everything.').wait_for()
 page.get_by_role('button',name='Upload data',exact=True).click()
 page.get_by_label('Pole locations',exact=True).set_input_files(dict(name='bad.csv',mimeType='text/csv',buffer=b'name,latitude,longitude,elevation\nP-1,,-90,15\n'))
 page.get_by_role('button',name='Validate and preview',exact=True).click()
 expect(page.get_by_role('alert')).to_contain_text('latitude')
 assert state['prepared'] is None and state['commits']==0
 page.get_by_label('Pole locations',exact=True).set_input_files(dict(name='locations.csv',mimeType='text/csv',buffer=b'name,latitude,longitude,elevation\nP-1,30,-90,15\n'))
 page.get_by_label('Measurement JSON',exact=True).set_input_files(dict(name='P-1.json',mimeType='application/json',buffer=json.dumps(dict(pole_id='P-1',attachments=[dict(name='Primary',height_m=8)])).encode()))
 page.get_by_label('Original photos',exact=True).set_input_files(dict(name='P-1.jpg',mimeType='image/jpeg',buffer=b'synthetic-photo'))
 page.get_by_role('button',name='Validate and preview',exact=True).click()
 page.get_by_role('heading',name='Review your package').wait_for()
 expect(page.get_by_label('Import preview')).to_contain_text('1 existing poles will be updated')
 assert state['prepared'] is None
 for width in [320,375,768,1440]:
  page.set_viewport_size(dict(width=width,height=1000));no_overflow(page)
 page.set_viewport_size(dict(width=1440,height=1000));page.screenshot(path=str(OUTPUT/'import-preview.png'),full_page=True)
 page.get_by_role('button',name='Confirm and publish import',exact=True).click()
 expect(page.get_by_role('alert')).to_contain_text('Connection interrupted')
 assert state['commits']==0 and len(state['files'])==2
 page.get_by_role('button',name='Retry and publish',exact=True).click()
 page.get_by_role('link',name='Open project and review surveys').wait_for()
 assert len(state['files'])==3 and state['commits']==1
 assert len(set(state['files']))==3
 page.get_by_role('link',name='Open project and review surveys').click()
 page.get_by_role('button',name='Review details',exact=True).click()
 page.get_by_role('button',name='Submit for review',exact=True).click()
 page.get_by_role('button',name='Approve survey',exact=True).wait_for()
 page.get_by_role('button',name='Approve survey',exact=True).click()
 page.get_by_role('button',name='Mark delivered',exact=True).click()
 expect(page.get_by_label('Survey review')).to_contain_text('Delivered')
 page.get_by_role('button',name='Return to uploaded',exact=True).click()
 expect(page.get_by_role('alert')).to_contain_text('Add a reason')
 page.get_by_label('Review note',exact=False).fill('Recheck primary attachment clearance')
 page.get_by_role('button',name='Return to uploaded',exact=True).click()
 page.get_by_role('button',name='Submit for review',exact=True).wait_for()
 page.get_by_role('button',name='Show project history',exact=True).click()
 expect(page.get_by_label('Activity history')).to_contain_text('Recheck primary attachment clearance')
 for width in [320,375,768,1440]:
  page.set_viewport_size(dict(width=width,height=1000));no_overflow(page)
 page.set_viewport_size(dict(width=1440,height=1000));page.screenshot(path=str(OUTPUT/'survey-review.png'),full_page=True)
 page.locator('html').evaluate("el=>el.dataset.theme='dark'");page.wait_for_timeout(250);page.screenshot(path=str(OUTPUT/'survey-review-dark.png'),full_page=True)
 page.get_by_label('Filter by review stage').select_option('approved')
 assert page.locator('.pole-list>button').count()==0
 page.get_by_label('Filter by review stage').select_option('uploaded')
 assert page.locator('.pole-list>button').count()==1
 page.goto(BASE_URL+'/admin');page.get_by_role('button',name='Activity history',exact=True).click()
 expect(page.get_by_label('Activity history')).to_contain_text('Recheck primary attachment clearance')
 page.set_viewport_size(dict(width=375,height=1000));no_overflow(page)
 assert not errors,errors
 context.close()
 for role in ['staff','client']:
  context=browser.new_context(viewport=dict(width=375,height=950));state=configure(context,role);state['stage']='needs_review'
  page=context.new_page();page.goto(BASE_URL+'/projects/project-one')
  page.get_by_label('Survey review').wait_for();no_overflow(page)
  assert page.get_by_role('button',name='Approve survey',exact=True).count()==0
  assert page.get_by_role('button',name='Mark delivered',exact=True).count()==0
  assert page.get_by_role('button',name='Return to uploaded',exact=True).count()==(1 if role=='staff' else 0)
  assert page.get_by_role('button',name='Show project history',exact=True).count()==(1 if role=='staff' else 0)
  context.close()
 browser.close()
 print('Quality browser checks passed: validation errors, replacement preview, interrupted storage upload/retry, atomic publish request, review stages/reason, project history, staff/client controls, and responsive layouts. No production writes occurred.')
