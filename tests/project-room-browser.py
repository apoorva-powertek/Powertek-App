"""Rebuilt project overview, explorer, authenticated photo restore and client controls."""
from viewer_fixtures import *
import zipfile
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=')
def configure_room(context,role='admin'):
 setup(context,role)
 poles=[]
 for i in range(76):
  row=dict(POLES[0]);row.update(id=f'pole-{i+1}',poleName=f'P-{i+1}',latitude=58.989+(i//10)*.0005,longitude=-122.849+(i%10)*.0005,photoAvailable=False)
  row['attachments']=[dict(id=f'a-{i}',name='Neutral',heightM=6.53,photoX=1,photoY=1,side='right',color=None,kind='neutral',sortOrder=0)]
  poles.append(row)
 state={'poles':poles,'prepared':None,'imports':[],'photo_requests':0}
 def fulfill(r,data,status=200):r.fulfill(status=status,content_type='application/json',body=json.dumps(data))
 context.route('**/api/projects/project-one/poles',lambda r:fulfill(r,dict(project={**PROJECTS[0],'client_code':'NORTH','published_at':None},canEdit=role!='client',poles=poles)))
 def image(r):
  state['photo_requests']+=1;pole=next(p for p in poles if '/'+p['id']+'/image' in r.request.url)
  if pole['photoAvailable']:r.fulfill(status=200,content_type='image/png',body=PNG)
  else:fulfill(r,{'error':'Original photo missing'},404)
 context.route('**/api/projects/project-one/poles/*/image',image)
 def importer(r):
  body=r.request.post_data_json
  if body['action']=='prepare':state['prepared']=body;state['imports'].append(body);fulfill(r,{'saved':True})
  else:
   pack=state['prepared'];pole=next(p for p in poles if p['poleName']==pack['poles'][0]['poleName'])
   pole.update(photoAvailable=True,imageFilename=pack['files'][0]['name'],imageWidth=1,imageHeight=1,updatedAt='2026-11-05T15:00:00Z',attachments=pack['poles'][0]['attachments']);fulfill(r,{'importedPoles':1})
 context.route('**/api/projects/project-one/import',importer)
 context.route('**/storage/v1/object/**',lambda r:fulfill(r,{'Key':'synthetic'}))
 context.route('**/*.arcgisonline.com/**',lambda r:r.abort())
 context.route('**/api/activity**',lambda r:fulfill(r,{'events':[],'next':None}))
 return state
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=1000),permissions=['clipboard-read','clipboard-write']);state=configure_room(context)
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE_URL+'/projects/project-one');page.get_by_role('heading',name='Fort Nelson Corridor',exact=True).wait_for()
 expect(page.get_by_role('region',name='Survey records table',exact=True)).to_be_visible()
 expect(page.get_by_label('Project summary',exact=True)).to_contain_text('Original photos')
 page.get_by_role('button',name='Copy permanent project link',exact=True).click();expect(page.get_by_role('status')).to_contain_text('Permanent project link copied');assert page.evaluate('navigator.clipboard.readText()')=='https://powertek-app.vercel.app/projects/project-one'
 assert state['photo_requests']==0,'A known missing photo should not be fetched as a broken image'
 expect(page.get_by_role('button',name='Open pole P-15',exact=True)).to_be_visible()
 assert page.get_by_role('button',name='Open pole P-16',exact=True).count()==0
 page.get_by_role('button',name='Next records page',exact=True).click();expect(page.get_by_role('button',name='Open pole P-16',exact=True)).to_be_visible()
 page.get_by_label('Search poles',exact=True).fill('P-76');expect(page.get_by_role('button',name='Open pole P-76',exact=True)).to_be_visible()
 page.get_by_role('button',name='Clear pole search',exact=True).click()
 page.get_by_role('button',name='Filters',exact=True).click();page.get_by_label('Filter by photo availability').select_option('available');expect(page.get_by_role('heading',name='No matching poles',exact=True)).to_be_visible();page.get_by_role('button',name='Clear filters',exact=True).first.click()
 for width in [320,375,768,1440,1920]:
  page.set_viewport_size(dict(width=width,height=1000))

  no_overflow(page)
 page.set_viewport_size(dict(width=1440,height=1000));page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'project-room-overview-light.png'),full_page=True)
 page.get_by_role('button',name='Switch to dark mode',exact=True).click();page.screenshot(path=str(OUTPUT/'project-room-overview-dark.png'),full_page=True)
 page.get_by_role('button',name='Switch to light mode',exact=True).click()
 page.get_by_role('button',name='Open pole P-1',exact=True).click();expect(page.get_by_role('heading',name='Original photo needs restoring',exact=True)).to_be_visible()
 assert page.locator('.photo-zoom .zoom-toolbar').count()==0
 page.get_by_label('Selected pole details',exact=True).get_by_role('button',name='Add photo to this pole',exact=True).click()
 dialog=page.get_by_role('dialog',name='Add photo to P-1',exact=True)
 dialog.get_by_label('Original pole photo',exact=True).set_input_files(dict(name='invalid.png',mimeType='image/png',buffer=b'not an image'));expect(dialog.get_by_role('alert')).to_contain_text('valid JPG')
 dialog.get_by_label('Original pole photo',exact=True).set_input_files(dict(name='camera-original.png',mimeType='image/png',buffer=PNG));expect(dialog.get_by_role('img',name='Preview of camera-original.png',exact=True)).to_be_visible()
 dialog.get_by_role('button',name='Save photo to this pole',exact=True).click();expect(dialog.get_by_role('status')).to_contain_text('Photo saved')
 assert state['imports'][0]['poles'][0]['attachments'][0]['heightM']==6.53
 assert state['imports'][0]['poles'][0]['attachments'][0]['photoX'] is None,'Different photo must clear stale pixel markers'
 dialog.get_by_role('button',name='View restored photo',exact=True).click();expect(page.get_by_role('img',name='P-1 full-resolution measured pole',exact=True)).to_be_visible()
 page.get_by_role('button',name='Photo',exact=True).click();expect(page.locator('.photo-zoom .zoom-toolbar')).to_be_visible()
 page.get_by_role('button',name='100%',exact=True).click();expect(page.locator('.photo-zoom .zoom-toolbar strong')).to_have_text('100%')
 page.get_by_role('button',name='Next pole',exact=True).click();expect(page.get_by_role('heading',name='Original photo needs restoring',exact=True)).to_be_visible()
 page.get_by_role('button',name='Satellite map',exact=True).click();canvas=page.get_by_label('Satellite project map',exact=True);expect(canvas).to_be_visible();assert int(canvas.get_attribute('data-map-zoom'))>=16
 details=page.get_by_label('Selected pole details',exact=True);rect=canvas.bounding_box();assert rect['x']+rect['width']<=details.bounding_box()['x']+1
 page.get_by_role('button',name='Locate Neutral, 6.530 metres',exact=True).click();expect(page.get_by_role('group',name='Survey views').get_by_role('button',name='Photo + model',exact=True)).to_have_attribute('aria-pressed','true')
 page.get_by_role('button',name='Review',exact=True).click();page.get_by_role('button',name='Review details',exact=True).click();expect(page.get_by_label('Survey review')).to_contain_text('Submit for review')
 page.get_by_role('button',name='Show project history',exact=True).click();expect(page.get_by_role('dialog',name='Project activity')).to_be_visible();page.keyboard.press('Escape')
 page.get_by_role('button',name='Overview',exact=True).click();expect(page.get_by_label('Project summary').locator('article').nth(1)).to_contain_text('1')
 assert state['photo_requests']>0
 page.set_viewport_size(dict(width=375,height=950));page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'project-room-overview-mobile.png'),full_page=True);no_overflow(page)
 page.get_by_role('button',name='Survey explorer',exact=True).click()
 for width in [320,375,768,1440]:page.set_viewport_size(dict(width=width,height=1000));no_overflow(page)
 assert not errors,errors
 client=browser.new_context(viewport=dict(width=375,height=950));configure_room(client,'client');c=client.new_page();c.goto(BASE_URL+'/projects/project-one');c.get_by_role('heading',name='Fort Nelson Corridor',exact=True).wait_for()
 assert c.get_by_role('button',name='Add data',exact=True).count()==0
 assert c.get_by_role('button',name='Review & client access',exact=True).count()==0
 c.get_by_role('button',name='Open pole P-1',exact=True).click();assert c.get_by_role('button',name='Add photo to this pole',exact=True).count()==0;no_overflow(c)
 context.close();client.close();browser.close();print('Project room checks passed: new overview, pagination/search/filters, verified photo states, responsive themes, validated per-pole photo preview/upload, preserved heights, cleared stale markers, restored original rendering/zoom, explorer/map, review/history and client permissions. All writes mocked.')
