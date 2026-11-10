"""Capture public client-dashboard graphics using fictional, intercepted data only.
Run with the local app running: python tests/capture-client-dashboard.py
Requires Playwright, Chromium and ffmpeg. No live accounts or private API calls.
"""
from browser_fixtures import *
import subprocess,tempfile
from datetime import datetime,timezone
from playwright.sync_api import expect
ROOT=Path(__file__).resolve().parents[1]
projects=json.loads((ROOT/'tests/client-dashboard-data.json').read_text())
source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
with sync_playwright() as p,tempfile.TemporaryDirectory() as temp:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for mobile in [False,True]:
  for theme in ['light','dark']:
   context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':960 if mobile else 1080},reduced_motion='reduce',device_scale_factor=1)
   setup(context,'client')
   context.add_init_script("localStorage.setItem('powertek-theme',"+json.dumps(theme)+");")
   profile={'id':'public-graphic-user','email':'client@example.com','displayName':'Westbrook Energy','role':'client','status':'active'}
   context.route('**/api/dashboard',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'user':profile,'projects':projects,'clients':[],'users':[],'notifications':[]})))
   page=context.new_page();page.goto(BASE_URL+'/portal');expect(page.get_by_role('heading',name='Your project library')).to_be_visible();page.evaluate('document.fonts.ready');no_overflow(page)
   name='client-dashboard-'+('mobile-' if mobile else '')+theme
   source=Path(temp)/(name+'.png');target=ROOT/'public'/(name+'.webp')
   page.screenshot(path=str(source),full_page=not mobile,animations='disabled')
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source),'-c:v','libwebp','-quality','90',str(target)],check=True)
   origin=f'Origin: screenshot of the real Powertek client workspace at {source_commit}, captured by tests/capture-client-dashboard.py with fictional tests/client-dashboard-data.json and intercepted authentication/API responses. No real customer data; not AI-generated or a real customer outcome.'
   target.with_suffix('.webp.json').write_text(json.dumps({'prompt':origin,'createdAt':datetime.now(timezone.utc).isoformat()},indent=2)+'\n')
   print(target.name,target.stat().st_size,flush=True);context.close()
 browser.close()
