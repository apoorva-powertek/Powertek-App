"""Visual-system checks: typography, scroll areas, theme, and responsive layout."""
from browser_fixtures import *
from playwright.sync_api import expect

def contrast(page,selector):
 return page.locator(selector).first.evaluate('''el=>{
 const rgb=s=>s.match(/[\\d.]+/g).map(Number);
 const l=c=>{let v=c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2]};
 let fg=rgb(getComputedStyle(el).color),node=el,bg;
 while(node){let c=rgb(getComputedStyle(node).backgroundColor);if(c.length<4||c[3]===1){bg=c;break}node=node.parentElement}
 if(!bg)bg=[255,255,255];let a=l(fg),b=l(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 }''')

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=900));setup(context)
 page=context.new_page();page.goto(BASE_URL+'/admin');page.get_by_role('heading',name='Workspace overview',exact=True).wait_for()
 page.evaluate('document.fonts.ready');assert page.evaluate('document.fonts.check("14px Inter")')
 assert 'Inter' in page.locator('.saas-workspace').evaluate('el=>getComputedStyle(el).fontFamily')
 assert page.locator('#workspace-title').evaluate('el=>parseFloat(getComputedStyle(el).fontSize)')>=28
 assert page.locator('.workspace-heading>div>p:last-child').evaluate('el=>parseFloat(getComputedStyle(el).fontSize)')>=13
 assert page.evaluate('document.documentElement.scrollHeight>innerHeight')
 assert page.evaluate('getComputedStyle(document.documentElement).overflowY')=='scroll'
 for theme in ['light','dark']:
  if theme=='dark':page.get_by_role('button',name='Switch to dark mode',exact=True).click()
  page.wait_for_timeout(200)
  assert page.locator('html').get_attribute('data-theme')==theme
  assert page.locator('html').evaluate('el=>getComputedStyle(el).colorScheme')==theme
  for selector in ['#workspace-title','.workspace-heading>div>p:last-child','.workspace-metric>div>span','.workspace-table th','.workspace-sidebar nav button.active']:
   assert contrast(page,selector)>=4.5,(theme,selector,contrast(page,selector))
  page.screenshot(path=str(OUTPUT/f'revamp-overview-{theme}.png'),full_page=True);no_overflow(page)
 page.reload();page.get_by_role('heading',name='Workspace overview',exact=True).wait_for();assert page.locator('html').get_attribute('data-theme')=='dark'
 # Theme changes from another open tab are reflected without reloading.
 other=context.new_page();other.goto(BASE_URL+'/admin?tab=projects');other.get_by_role('heading',name='Projects',exact=True).wait_for()
 other.get_by_role('button',name='Switch to light mode',exact=True).click()
 expect(page.locator('html')).to_have_attribute('data-theme','light');other.close()
 for width in [320,375,768,1024,1440,1920]:
  page.set_viewport_size(dict(width=width,height=900));no_overflow(page)
  if width==375:
   region=page.get_by_role('region',name='Project summary table',exact=True)
   assert region.evaluate('el=>el.scrollWidth>el.clientWidth')
   region.focus();region.press('ArrowRight');page.wait_for_function('document.querySelector(".project-table-wrap").scrollLeft>0')
   page.screenshot(path=str(OUTPUT/'revamp-overview-mobile.png'),full_page=True)
 # Sidebar remains independently scrollable at short viewport heights.
 page.set_viewport_size(dict(width=1280,height=380))
 assert page.locator('.workspace-sidebar').evaluate('el=>el.scrollHeight>el.clientHeight')
 page.get_by_role('button',name='Sign out',exact=True).scroll_into_view_if_needed()
 box=page.get_by_role('button',name='Sign out',exact=True).bounding_box();assert 0<=box['y'] and box['y']+box['height']<=380
 context.close()
 # A fresh session follows the device's dark preference until the user chooses.
 context=browser.new_context(color_scheme='dark');setup(context)
 page=context.new_page();page.goto(BASE_URL+'/admin');page.get_by_role('heading',name='Workspace overview',exact=True).wait_for()
 assert page.locator('html').get_attribute('data-theme')=='dark';context.close()
 browser.close()
 print('Design checks passed: local Inter font, readable text, light/dark contrast, persistent and cross-tab theme, native color scheme, page/table/sidebar scrolling, system theme and responsive layouts (320–1920px).')
