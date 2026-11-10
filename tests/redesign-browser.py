"""Client-first redesign regression: public isolation, role separation and real controls."""
from browser_fixtures import *
from playwright.sync_api import expect
import zipfile
import csv,io
REVIEW=Path('/workspace/Powertek-App/.impeccable/review');REVIEW.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();errors=[];private=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:private.append(r.url) if '/api/' in r.url or '.supabase.co/' in r.url else None)
 page.goto(BASE_URL+'/');demo=page.get_by_role('region',name='Interactive client dashboard preview',exact=True)
 expect(demo.get_by_role('heading',name='Your project library')).to_be_visible()
 expect(demo.get_by_role('button',name='Dashboard',exact=True)).to_be_enabled()
 assert 'sample' not in demo.inner_text().lower()
 for forbidden in ['Awaiting review','Needs attention','Coverage by client','People & access','Operations overview']:
  assert forbidden not in demo.inner_text(),forbidden
 expect(demo.get_by_label('Your project summary')).to_contain_text('288')
 demo.get_by_role('button',name='View project',exact=True).first.click()
 expect(demo.get_by_role('heading',name='Measured attachments')).to_be_visible()
 demo.get_by_label('Choose pole',exact=True).select_option('1')
 demo.get_by_role('button',name='Primary',exact=False).click()
 demo.get_by_role('button',name='Show all measurements').click()
 demo.get_by_role('button',name='Deliverables',exact=True).click()
 with page.expect_download() as event: demo.get_by_role('button',name='Download tour package').click()
 download=event.value;archive=zipfile.ZipFile(download.path());assert sum(n.endswith('.html') for n in archive.namelist())==3
 demo.get_by_role('button',name='Reset product preview').click()
 expect(demo.get_by_role('heading',name='Your project library')).to_be_visible()
 demo.get_by_role('button',name='Browse project files',exact=True).click()
 expect(demo.get_by_role('heading',name='Project deliverables')).to_be_visible()
 demo.get_by_role('button',name='Reset product preview').click()
 page.get_by_role('button',name='Thermal rating analysis',exact=True).click()
 expect(page.locator('.home-service-detail')).to_contain_text('Conductor operating limits')
 page.get_by_role('button',name='03 Share & deliver',exact=False).click()
 expect(page.locator('.home-stage-detail')).to_contain_text('Notify clients in their workspace')
 page.locator('details').first.locator('summary').click();expect(page.locator('details').first).to_have_attribute('open','')
 assert not private,private
 for width in [320,375,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':1000});no_overflow(page)
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate('scrollTo(0,0)');page.evaluate('document.fonts.ready');page.screenshot(path=str(REVIEW/'desktop.png'),full_page=True,animations="disabled")
 page.get_by_role('button',name='Switch to dark mode').click();page.screenshot(path=str(REVIEW/'home-dark.png'),full_page=True,animations="disabled")
 page.set_viewport_size({'width':375,'height':950});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(REVIEW/'mobile.png'),full_page=True,animations="disabled")
 page.get_by_role('button',name='Open navigation menu').click();page.keyboard.press('Escape');expect(page.get_by_role('button',name='Open navigation menu')).to_be_focused()
 page.emulate_media(reduced_motion='reduce');assert page.locator('.home-atlas-route path').evaluate('e=>getComputedStyle(e).animationName')=='none'
 assert not errors,errors
 c.close()
 for role in ['admin','client','staff']:
  c=b.new_context(viewport={'width':1440,'height':1000});setup(c,role)
  if role=='client':
   payload={'user':{'id':'test-user','email':'test@example.com','displayName':'Alex Morgan','role':'client','status':'active'},'projects':[PROJECTS[0],{**PROJECTS[1],'can_view':False}],'clients':[],'users':[]}
   c.route('**/api/dashboard',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(payload)))
  page=c.new_page();page.goto(BASE_URL+('/admin' if role=='admin' else '/portal'))
  page.get_by_role('heading',name='Workspace overview',exact=True).wait_for()
  if role=='client':
   expect(page.get_by_role('heading',name='Your project library')).to_be_visible()
   for label in ['New project','Invite people','Upload data','People & access']:
    assert page.get_by_role('button',name=label,exact=True).count()==0,label
   assert page.get_by_text('Awaiting review',exact=True).count()==0
   paused=page.locator('.client-project-row').filter(has_text='North Grid Inspection')
   expect(paused).to_contain_text('Update under review');assert '120' not in paused.inner_text()
   assert paused.get_by_role('progressbar').count()==0 and paused.get_by_role('link').count()==0
   with page.expect_download() as event:page.get_by_role('button',name='Export summary',exact=True).click()
   rows=list(csv.reader(io.StringIO(Path(event.value.path()).read_text())))
   blocked=next(row for row in rows if row[0]=='North Grid Inspection');assert blocked[2]=='Update under review' and blocked[3:7]==['','','','']
   expect(page.get_by_role('link',name='Browse project files')).to_have_attribute('href','/projects/project-one?section=files')
  if role=='admin':
   expect(page.get_by_role('button',name='Invite people')).to_be_visible()
   expect(page.get_by_role('heading',name='Needs attention')).to_be_visible()
  for width in [320,375,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});no_overflow(page)
  page.set_viewport_size({'width':1440,'height':1000});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(REVIEW/(role+'-desktop.png')),full_page=True,animations="disabled")
  page.get_by_role('button',name='Switch to dark mode').click()
  page.set_viewport_size({'width':375,'height':950});page.screenshot(path=str(REVIEW/(role+'-mobile.png')),full_page=True,animations="disabled")
  c.close()
 for admin in [False,True]:
  c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();page.goto(BASE_URL+('/admin' if admin else '/portal'))
  page.get_by_role('button',name='Sign in to your portal').wait_for()
  page.get_by_label('Work email',exact=True).fill('synthetic@example.com');page.get_by_label('Password',exact=True).fill('Synthetic-password-12')
  page.get_by_role('button',name='Show password',exact=True).click();expect(page.get_by_label('Password',exact=True)).to_have_attribute('type','text')
  page.get_by_role('button',name='Hide password',exact=True).click();expect(page.get_by_label('Password',exact=True)).to_have_attribute('type','password')
  expect(page.get_by_role('link',name='Administration',exact=True)).to_have_attribute('href','/admin')
  page.get_by_role('button',name='Forgot password?',exact=True).click();expect(page.get_by_role('button',name='Send reset email',exact=True)).to_be_visible()
  page.get_by_role('button',name='Back to sign in',exact=True).click()
  name='admin-login' if admin else 'client-login'
  page.screenshot(path=str(REVIEW/(name+'-desktop.png')),full_page=True,animations="disabled")
  for width in [320,375,768,1024,1440,1920]:page.set_viewport_size({'width':width,'height':1000});no_overflow(page)
  page.get_by_role('button',name='Switch to dark mode').click();page.set_viewport_size({'width':375,'height':950});assert page.get_by_label('Work email',exact=True).evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=16;page.screenshot(path=str(REVIEW/(name+'-mobile.png')),full_page=True,animations="disabled");c.close()
 b.close();print('Redesign checks passed: client preview isolation and richer data; no sample labels or administrator panels; interactive records/model/package download; role separation; password visibility/recovery navigation; light/dark; reduced motion; responsive 320–1920px. All private responses and writes mocked.')
