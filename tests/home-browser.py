"""Public home interactions, client dashboard graphics, motion, responsive styles and no private requests."""
from browser_fixtures import *
from playwright.sync_api import expect
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport=dict(width=1440,height=1000));private=[]
 def block(route):private.append(route.request.url);route.abort()
 for pattern in ['**/api/**','**/rest/v1/**','**/storage/v1/**']:context.route(pattern,block)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE_URL+'/');page.get_by_role('heading',name='Your network. Every detail connected.',exact=False).wait_for();page.evaluate('document.fonts.ready')
 visual=page.get_by_role('figure',name='Client dashboard image',exact=True)
 expect(visual.get_by_role('img')).to_be_visible()
 expect(page.get_by_role('group',name='Explore engineering services').get_by_role('button').first).to_be_enabled()
 assert visual.locator('button,a,input,select,[tabindex]').count()==0
 assert page.locator('.product-demo,.demo-viewport').count()==0
 assert visual.get_by_role('img').evaluate('e=>e.complete && e.naturalWidth>0')
 assert 'client-dashboard-light.webp' in visual.get_by_role('img').get_attribute('src')
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
   page.get_by_role('button',name='Open navigation menu',exact=True).click();nav=page.get_by_role('navigation',name='Mobile navigation',exact=True);expect(nav).to_be_visible();nav.get_by_role('link',name='Client workspace',exact=False).click();expect(nav).to_be_hidden()
   page.get_by_role('button',name='Open navigation menu',exact=True).click();page.keyboard.press('Escape');expect(nav).to_be_hidden();expect(page.get_by_role('button',name='Open navigation menu',exact=True)).to_be_focused()
  if width==375:page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUTPUT/'home-rebuild-mobile.png'),full_page=True,animations="disabled")
 assert not errors,errors
 assert not private,private
 context.close()
 reduced=browser.new_context(viewport=dict(width=375,height=950),reduced_motion='reduce');q=reduced.new_page();q.goto(BASE_URL+'/');q.get_by_role('heading',name='Your network. Every detail connected.',exact=False).wait_for()
 assert q.locator('.home-hero-product').evaluate('e=>getComputedStyle(e).animationName')=='none'
 q.get_by_role('button',name='Open navigation menu',exact=True).click();q.get_by_role('navigation',name='Mobile navigation').get_by_role('link',name='Client sign in',exact=False).click();q.get_by_role('button',name='Sign in to your portal',exact=True).wait_for()
 reduced.close();browser.close();print('Home checks passed: static client dashboard images without public demo controls, service/workflow controls, FAQ/contact/sign-in, mobile navigation, responsive widths, light/dark and reduced motion; no private data requests.')
