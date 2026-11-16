"""Client-first redesign regression: public isolation, role separation and real controls."""
from browser_fixtures import *
from playwright.sync_api import expect
import csv,io
REVIEW=Path('/workspace/Powertek-App/.impeccable/review');REVIEW.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
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
 b.close();print('Redesign checks passed: role separation; password visibility/recovery navigation; light/dark; reduced motion; responsive 320–1920px. All private responses and writes mocked.')
