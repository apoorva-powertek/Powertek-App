"""Project viewer geometry, map behavior, missing-image recovery and real controls."""
from viewer_fixtures import *
import zipfile

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1600,height=1000));state=configure(context)
 poles=[]
 for i in range(76):
  pole=dict(POLES[0]);pole.update(id=f'pole-{i+1}',poleName=f'P-{i+1}',latitude=58.989+(i//10)*.0005,longitude=-122.849+(i%10)*.0005)
  pole['attachments']=[dict(id=f'a-{i}-{j}',name=name,heightM=height,photoX=None,photoY=None,side='right') for j,(name,height) in enumerate([('Primary',8.25),('Neutral',6.53),('Communication',4.123)])]
  poles.append(pole)
 def records(route):route.fulfill(status=200,content_type='application/json',body=json.dumps(dict(project={**PROJECTS[0],'client_code':'NORTH'},canEdit=True,poles=poles)))
 context.route('**/api/projects/project-one/poles',records)
 def image(route):
  if state['photoReady']:route.fulfill(status=200,content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII='))
  else:route.fulfill(status=404,content_type='application/json',body='{"error":"The original photo is missing from this project. Upload the matching original to restore it."}')
 context.route('**/api/projects/project-one/poles/*/image',image)
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE_URL+'/projects/project-one');page.get_by_label('Selected pole details',exact=True).wait_for()
 canvas=page.get_by_label('Satellite project map',exact=True);expect(canvas).to_be_visible()
 assert int(canvas.get_attribute('data-map-zoom'))>=16
 inspector=page.get_by_label('Selected pole details',exact=True)
 expect(inspector.get_by_role('heading',name='P-1',exact=True)).to_be_visible()
 expect(inspector.get_by_role('heading',name='Original photo unavailable',exact=True)).to_be_visible()
 assert inspector.locator('.zoom-toolbar').count()==0
 expect(inspector.get_by_role('link',name='Upload matching photos',exact=True)).to_be_visible()
 assert page.locator('.map-selected-card').count()==0
 for width,height in [(1920,1080),(1600,1000),(1280,800)]:
  page.set_viewport_size(dict(width=width,height=height));page.wait_for_timeout(150);no_overflow(page)
  rect=canvas.bounding_box();details=inspector.bounding_box()
  assert rect['x']+rect['width']<=details['x']+1,'Inspector overlaps map'
  assert rect['height']>height*.55,'Map loses too much vertical space'
  assert page.locator('.pole-list').evaluate('(e)=>e.scrollHeight>e.clientHeight'), 'Record list cannot scroll'
 page.set_viewport_size(dict(width=1600,height=1000));page.wait_for_timeout(150)
 page.screenshot(path=str(OUTPUT/'viewer-redesign-light.png'),full_page=True)
 page.get_by_role('button',name='Switch to dark mode',exact=True).click()
 assert page.locator('.pole-inspector').evaluate("e=>getComputedStyle(e).backgroundColor")=='rgb(21, 30, 43)'
 page.screenshot(path=str(OUTPUT/'viewer-redesign-dark.png'),full_page=True)
 page.get_by_role('button',name='Switch to light mode',exact=True).click()
 page.get_by_role('button',name='Next pole',exact=True).click();expect(inspector.get_by_role('heading',name='P-2',exact=True)).to_be_visible()
 lon,lat=map(float,canvas.get_attribute('data-map-center').split(','));assert abs(lon-poles[1]['longitude'])<.00001
 zoom=int(canvas.get_attribute('data-map-zoom'));page.get_by_role('button',name='Zoom map in',exact=True).click();expect(canvas).to_have_attribute('data-map-zoom',str(zoom+1))
 canvas.focus();canvas.press('ArrowRight');assert canvas.get_attribute('data-map-center')!=f"{lon},{lat}"
 page.get_by_role('button',name='Fit map to poles',exact=True).click();assert int(canvas.get_attribute('data-map-zoom'))>=16
 with page.expect_download() as pole_package:page.get_by_role('button',name='Download pole',exact=True).click()
 with zipfile.ZipFile(pole_package.value.path()) as archive:assert 'MISSING_PHOTO.txt' in archive.namelist()
 with page.expect_download() as project_package:page.get_by_role('button',name='Download all poles',exact=True).click()
 with zipfile.ZipFile(project_package.value.path()) as archive:assert sum(line.startswith('P-') for line in archive.read('MISSING_PHOTOS.txt').decode().splitlines())==76
 state['photoReady']=True;page.get_by_role('button',name='Retry photo',exact=True).click()
 expect(page.get_by_role('heading',name='Original photo unavailable',exact=True)).to_have_count(0)
 expect(page.locator('.inspector-photo img')).to_be_visible()
 with page.expect_download() as restored:page.get_by_role('button',name='Download pole',exact=True).click()
 with zipfile.ZipFile(restored.value.path()) as archive:assert any(n.startswith('original_photo/') and n.endswith('.png') for n in archive.namelist())
 page.get_by_role('button',name='Locate Neutral, 6.530 metres',exact=True).click();expect(page.locator('.split-view')).to_be_visible()
 page.get_by_role('button',name='SPIDA profile',exact=True).click();expect(page.get_by_role('img',name='SPIDA-style model of P-2 with exact measured attachments')).to_be_visible()
 assert page.locator('.model-stage svg>rect').first.evaluate('e=>getComputedStyle(e).fill')=='rgb(247, 249, 252)'
 page.get_by_role('button',name='Satellite map',exact=True).click()
 page.get_by_label('Search poles',exact=True).fill('not-a-pole');expect(page.locator('.map-empty-state')).to_be_visible();assert page.locator('.pole-inspector').count()==0
 page.get_by_role('button',name='Clear pole search',exact=True).click();expect(page.locator('.pole-inspector')).to_be_visible()
 for width,height in [(1024,768),(768,1024),(375,900),(320,740)]:
  page.set_viewport_size(dict(width=width,height=height));page.wait_for_timeout(150);no_overflow(page)
  page.get_by_role('button',name='Open pole list',exact=True).click();drawer=page.get_by_role('dialog',name='Survey records',exact=True)
  expect(drawer).to_be_visible();drawer.get_by_label('Search poles',exact=True).fill('P-76');drawer.locator('.pole-list>button').click();expect(inspector.get_by_role('heading',name='P-76',exact=True)).to_be_visible()
  page.get_by_role('button',name='Open pole list',exact=True).click();drawer.get_by_role('button',name='Clear pole search',exact=True).click();page.keyboard.press('Escape')
  expect(page.get_by_role('button',name='Open pole list',exact=True)).to_be_focused()
  page.wait_for_timeout(220);page.locator('.viewer-main').evaluate('e=>e.scrollTo(0,0)')
  if width==375:page.screenshot(path=str(OUTPUT/'viewer-redesign-mobile.png'),full_page=True)
 assert not errors,errors
 context.close();browser.close()
 print('Viewer checks passed: separate inspector, readable themes, responsive canvas/record list, accurate extent fitting, selection/centering, keyboard map controls, attachment focus, missing-photo upload action, no phantom zoom controls, empty search, mobile drawer and focus return. All requests mocked.')
