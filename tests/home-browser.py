"""Public home interactions, real product preview, motion, responsive styles and no private requests."""
from browser_fixtures import *
from playwright.sync_api import expect
import zipfile
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=1000));private=[]
 def block(route):private.append(route.request.url);route.abort()
 for pattern in ['**/api/**','**/rest/v1/**','**/storage/v1/**']:context.route(pattern,block)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE_URL+'/');page.get_by_role('heading',name='Your network. Every detail connected.',exact=False).wait_for();page.evaluate('document.fonts.ready')
 preview=page.get_by_role('region',name='Interactive client dashboard preview',exact=True)
 expect(preview).to_contain_text('Your project library');assert 'sample' not in preview.inner_text().lower()
 expect(preview.get_by_role('button',name='Dashboard',exact=True)).to_be_enabled()
 preview.get_by_role('button',name='View project',exact=True).first.click();expect(page.get_by_label('Choose pole',exact=True)).to_be_visible();assert '/projects/' not in page.url
 page.get_by_label('Choose pole',exact=True).select_option('1');page.get_by_role('button',name='Neutral',exact=False).click();expect(preview.locator('.model-zoom .zoom-toolbar strong')).to_have_text('175%')
 page.get_by_role('button',name='Show all measurements',exact=True).click();page.get_by_role('button',name='Zoom model in',exact=True).click();expect(preview.locator('.model-zoom .zoom-toolbar strong')).to_have_text('125%')
 page.get_by_role('button',name='Deliverables',exact=True).click()
 with page.expect_download() as exported:page.get_by_role('button',name='Download tour package',exact=True).click()
 with zipfile.ZipFile(exported.value.path()) as package:
  assert len([n for n in package.namelist() if n.endswith('.html')])==3
  assert 'CC-2026_all_poles.csv' in package.namelist()
 expect(page.get_by_role('status')).to_contain_text('Workspace tour package downloaded')
 page.get_by_role('button',name='Reset product preview',exact=True).click()
 for title in ['Vegetation risk management','Thermal IR surveys','Transmission line modelling']:
  page.get_by_role('group',name='Explore engineering services').get_by_role('button',name=title,exact=False).click();expect(page.locator('.home-service-body h3')).to_have_text(title)
 page.get_by_role('button',name='Share & deliver',exact=False).click();expect(page.locator('.home-stage-copy h3')).to_have_text('Share & deliver')
 page.get_by_role('button',name='Capture & organise',exact=False).click();expect(page.locator('.home-stage-copy')).to_contain_text('Preview the package')
 faq=page.get_by_text('Will I be notified when my project is ready?',exact=True);faq.click();expect(page.locator('.home-faq details[open]')).to_contain_text('in-app notification')
 assert page.locator('a[href="mailto:vnr@powertekecp.com"]').count()>=2
 assert page.locator('a[href="tel:+919573263993"]').count()==1
 page.locator('[data-reveal]').evaluate_all("els=>els.forEach(e=>e.classList.remove('reveal-pending'))");page.evaluate('scrollTo(0,0)');page.wait_for_timeout(850);page.screenshot(path=str(OUTPUT/'home-rebuild-desktop-light.png'),full_page=True,animations="disabled")
 page.get_by_role('button',name='Switch to dark mode',exact=True).click();page.screenshot(path=str(OUTPUT/'home-rebuild-desktop-dark.png'),full_page=True,animations="disabled")
 assert page.locator('.powertek-home').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(15, 23, 36)'
 page.get_by_role('button',name='Switch to light mode',exact=True).click()
 for width in [320,375,768,1024,1440,1920]:
  page.set_viewport_size(dict(width=width,height=1000));no_overflow(page)
  if width<=900:
   page.get_by_role('button',name='Open navigation menu',exact=True).click();nav=page.get_by_role('navigation',name='Mobile navigation',exact=True);expect(nav).to_be_visible();nav.get_by_role('link',name='Workspace preview',exact=False).click();expect(nav).to_be_hidden()
   page.get_by_role('button',name='Open navigation menu',exact=True).click();page.keyboard.press('Escape');expect(nav).to_be_hidden();expect(page.get_by_role('button',name='Open navigation menu',exact=True)).to_be_focused()
  if width==375:page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'home-rebuild-mobile.png'),full_page=True,animations="disabled")
 assert not errors,errors
 assert not private,private
 context.close()
 reduced=browser.new_context(viewport=dict(width=375,height=950),reduced_motion='reduce');q=reduced.new_page();q.goto(BASE_URL+'/');q.get_by_role('heading',name='Your network. Every detail connected.',exact=False).wait_for()
 assert q.locator('.home-hero-product').evaluate('e=>getComputedStyle(e).animationName')=='none'
 q.get_by_role('button',name='Open navigation menu',exact=True).click();q.get_by_role('navigation',name='Mobile navigation').get_by_role('link',name='Client sign in',exact=False).click();q.get_by_role('button',name='Sign in to your portal',exact=True).wait_for()
 reduced.close();browser.close();print('Home checks passed: real dashboard filters/navigation, measured profile interactions, sample ZIP download, service/workflow controls, FAQ/contact/sign-in, mobile navigation, responsive widths, light/dark and reduced motion; no private data requests.')
