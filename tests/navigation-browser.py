"""Navigation regression checks with synthetic accounts and intercepted writes."""
from viewer_fixtures import *

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=1000));state=configure(context)
 page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(BASE_URL+'/admin')
 page.get_by_role('button',name='Explore projects',exact=True).click()
 page.get_by_role('heading',name='Projects',exact=True).wait_for();assert url_tab(page)=='projects'
 page.get_by_label('Search projects',exact=True).fill('Fort Nelson')
 page.get_by_role('button',name='List view',exact=True).click()
 expect(page.locator('.workspace-project-card')).to_have_count(1)
 page.reload();page.get_by_role('heading',name='Projects',exact=True).wait_for()
 expect(page.get_by_label('Search projects',exact=True)).to_have_value('Fort Nelson')
 expect(page.locator('.workspace-project-card.is-list')).to_have_count(1)
 page.get_by_role('button',name='Clear',exact=True).click()
 tab(page,'Clients');page.get_by_role('heading',name='Clients',exact=True).wait_for()
 page.get_by_role('button',name='Open client projects',exact=True).first.click()
 page.get_by_role('heading',name='Projects',exact=True).wait_for();expect(page.get_by_label('Filter by client')).to_have_value('client-one')
 expect(page.locator('.workspace-project-card')).to_have_count(2)
 page.go_back();page.get_by_role('heading',name='Clients',exact=True).wait_for()
 page.go_forward();page.get_by_role('heading',name='Projects',exact=True).wait_for()
 page.locator('.workspace-project-card').filter(has_text='Fort Nelson Corridor').click()
 page.get_by_label('Survey review',exact=True).wait_for()
 page.get_by_role('link',name='Projects',exact=True).click()
 page.get_by_role('heading',name='Projects',exact=True).wait_for();assert url_tab(page)=='projects'
 tab(page,'Overview');page.get_by_role('button',name='Explore projects',exact=True).wait_for()
 page.get_by_role('button',name='Northline Utilities',exact=False).filter(has=page.locator('.progress-track')).click()
 expect(page.get_by_label('Filter by client')).to_have_value('client-one')
 # Project return paths also preserve the section for staff/client accounts.
 for role,entry in [('admin','/portal?tab=projects'),('staff','/portal?tab=projects'),('client','/portal?tab=projects')]:
  other=browser.new_context();configure(other,role);q=other.new_page();q.goto(BASE_URL+entry)
  q.get_by_role('heading',name='Projects',exact=True).wait_for()
  assert urlparse(q.url).path==('/admin' if role=='admin' else '/portal')
  q.locator('.workspace-project-card').first.click();q.get_by_role('link',name='Projects',exact=True).click()
  q.get_by_role('heading',name='Projects',exact=True).wait_for()
  if role!='admin':
   q.goto(BASE_URL+'/portal?tab=users');q.get_by_role('heading',name='Workspace overview').wait_for()
   expect(q.locator('.workspace-topbar strong')).to_have_text('Overview')
  other.close()
 # Direct section links, mobile menu, and URL state stay usable at every width.
 for width in [320,375,768,1440]:
  page.set_viewport_size(dict(width=width,height=1000))
  for name,heading in [('Overview','Workspace overview'),('Projects 3','Projects'),('Clients','Clients'),('People & access','People & access'),('Activity history','Activity history'),('Upload data','Upload data')]:
   tab(page,name);page.locator('#workspace-title').filter(has_text=heading).wait_for();no_overflow(page)
 # Cancelling section navigation or Back preserves a pending upload preview.
 page.get_by_label('Pole locations',exact=True).set_input_files(dict(name='locations.csv',mimeType='text/csv',buffer=b'name,latitude,longitude,elevation\nP-1,30,-90,15\n'))
 page.get_by_role('button',name='Validate and preview',exact=True).click()
 page.get_by_role('heading',name='Review your package',exact=True).wait_for()
 pending_url=page.url;dialogs=[]
 def reject(dialog):dialogs.append(dialog.message);dialog.dismiss()
 page.once('dialog',reject);page.get_by_role('button',name='Invite people',exact=True).click()
 assert page.url==pending_url and len(dialogs)==1
 expect(page.get_by_role('heading',name='Review your package',exact=True)).to_be_visible()
 page.once('dialog',reject);page.go_back()
 expect(page.get_by_role('heading',name='Review your package',exact=True)).to_be_visible()
 assert page.url==pending_url and len(dialogs)==2
 page.get_by_role('button',name='Change package',exact=True).click()
 # Repeating sign-in for the same account in another tab preserves form drafts.
 tab(page,'People & access')
 page.get_by_label('Full name',exact=True).fill('Unsaved teammate')
 sibling=context.new_page();sibling.goto(BASE_URL+'/admin?tab=projects')
 sibling.get_by_role('heading',name='Projects',exact=True).wait_for();sibling.close();page.bring_to_front()
 expect(page.get_by_label('Full name',exact=True)).to_have_value('Unsaved teammate')
 # Viewer filters toggle, missing-photo retry, and print/report return links.
 page.set_viewport_size(dict(width=1440,height=1000));page.goto(BASE_URL+'/projects/project-one')
 page.get_by_role('button',name='Hide filters',exact=True).click()
 expect(page.get_by_label('Filter by review stage')).to_be_hidden()
 page.get_by_role('button',name='Show filters',exact=True).click()
 page.get_by_label('Filter by review stage').select_option('draft')
 expect(page.locator('.pole-list>button')).to_have_count(1)
 page.get_by_label('Filter by review stage').select_option('all')
 expect(page.locator('.pole-list>button')).to_have_count(2)
 page.get_by_role('button',name='Photo',exact=True).click()
 page.get_by_role('button',name='Retry photo',exact=True).wait_for()
 state['photoReady']=True;before=state['images'];page.get_by_role('button',name='Retry photo',exact=True).click()
 expect(page.locator('.image-loading')).to_have_count(0)
 expect(page.locator('.photo-load-error')).to_have_count(0);assert state['images']>before
 page.get_by_role('button',name='100%',exact=True).click()
 expect(page.locator('.photo-zoom .zoom-toolbar strong')).to_have_text('100%')
 with page.expect_popup() as opened:page.get_by_role('link',name='Print / PDF',exact=True).click()
 report=opened.value;report.get_by_role('heading',name='P-1',exact=True).wait_for()
 report.evaluate('window.print=()=>window.__printed=true')
 report.get_by_role('button',name='Print / Save PDF',exact=True).click();assert report.evaluate('window.__printed')
 report.get_by_role('link',name='Back to project',exact=True).click();report.get_by_label('Survey review',exact=True).wait_for();report.close()
 state['reportError']=True
 report=context.new_page();report.goto(BASE_URL+'/projects/project-one/poles/pole-one/report')
 expect(report.get_by_role('alert')).to_have_text('Report service unavailable')
 expect(report.get_by_role('link',name='Back to project',exact=True)).to_be_visible();report.close();state['reportError']=False
 page.get_by_role('button',name='SPIDA profile',exact=True).click()
 page.get_by_role('button',name='Zoom model in',exact=True).click()
 expect(page.locator('.model-zoom .zoom-toolbar strong')).to_have_text('125%')
 page.get_by_role('button',name='Satellite map',exact=True).click()
 page.get_by_role('button',name='Zoom map in',exact=True).click()
 page.get_by_role('button',name='Fit map to poles',exact=True).click()
 page.get_by_role('link',name='Go to projects',exact=True).click()
 page.get_by_role('heading',name='Projects',exact=True).wait_for()
 # Viewer error state also returns to the projects list.
 state['reportError']=True;page.goto(BASE_URL+'/projects/project-one')
 page.get_by_role('link',name='Return to projects',exact=True).click()
 page.get_by_role('heading',name='Projects',exact=True).wait_for();state['reportError']=False
 # Sign out remains reachable and actually clears the current UI session.
 page.get_by_role('button',name='Sign out',exact=True).click()
 page.get_by_role('button',name='Sign in to your portal',exact=True).wait_for()
 assert not errors,errors
 context.close()
 # Signed-in users returning from sign-in are sent to the intended project only.
 context=browser.new_context();configure(context)
 page=context.new_page();page.goto(BASE_URL+'/portal?next=%2Fprojects%2Fproject-one')
 page.get_by_label('Survey review',exact=True).wait_for();assert urlparse(page.url).path=='/projects/project-one'
 context.close()
 context=browser.new_context();configure(context)
 page=context.new_page();page.goto(BASE_URL+'/portal?next=https%3A%2F%2Fexample.com')
 page.get_by_role('heading',name='Workspace overview').wait_for();assert urlparse(page.url).netloc==urlparse(BASE_URL).netloc
 context.close()
 browser.close()
 print('Navigation checks passed: section URLs, filters/view persistence, Back/Forward, client/project returns across roles, mobile links, viewer filters, photo retry, report/print/error returns, safe sign-in destinations, and sign-out. No live writes occurred.')
