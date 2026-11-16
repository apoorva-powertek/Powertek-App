"""Public multi-page website: routes, links, responsive themes, filters and safe enquiry drafts.
Uses no real accounts. Contact drafting never sends a message or contacts private APIs.
"""
from browser_fixtures import *
from playwright.sync_api import expect
from urllib.parse import urlparse,parse_qs
import xml.etree.ElementTree as ET
REVIEW=Path(os.environ.get('POWERTEK_MARKETING_REVIEW','/workspace/Powertek-App/.impeccable/review/engineering'))
REVIEW.mkdir(parents=True,exist_ok=True)
def settle_capture(page):
 page.evaluate('document.fonts.ready')
 page.wait_for_function("!document.querySelector('.pt-site-menu-toggle')?.disabled")
 for image in page.locator('main img').all():
  if image.is_visible():
   image.scroll_into_view_if_needed()
   page.wait_for_function('(image)=>image.complete && image.naturalWidth>0',arg=image.element_handle())
 page.evaluate('scrollTo(0,0)')
slugs=['transmission-line-modelling','thermal-rating-analysis','vegetation-risk-management','high-resolution-inspection','thermal-ir-surveys','corona-uv-inspection']
routes=['/','/services','/about','/process','/contact','/credits']+['/services/'+s for s in slugs]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000},permissions=['clipboard-read','clipboard-write']);private=[]
 def block(route):private.append(route.request.url);route.abort()
 for pattern in ['**/api/**','**/rest/v1/**','**/storage/v1/**','**/*.supabase.co/**']:context.route(pattern,block)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for path in routes:
  response=page.goto(BASE_URL+path);assert response.status==200,(path,response.status)
  expect(page.locator('main h1')).to_have_count(1);expect(page.locator('main h1')).to_be_visible()
  assert 'Powertek Utility Services' in page.title()
  assert page.locator('meta[name="description"]').get_attribute('content')
  assert page.locator('link[rel="canonical"]').get_attribute('href')=='https://powertek-app.vercel.app'+path
  expect(page.locator('header').get_by_role('link',name='Powertek home')).to_have_attribute('href','/')
  for width in [320,390,768,1024,1440,1920]:page.set_viewport_size({'width':width,'height':1000});no_overflow(page)
  page.set_viewport_size({'width':1440,'height':1000});settle_capture(page)
  name='home' if path=='/' else path.strip('/').replace('/','-')
  settle_capture(page);page.screenshot(path=str(REVIEW/(name+'-desktop.png')),full_page=True,animations='disabled')
  page.set_viewport_size({'width':390,'height':950});settle_capture(page);page.screenshot(path=str(REVIEW/(name+'-mobile.png')),full_page=True,animations='disabled')
 # The first viewport explains engineering; the dashboard is a small section later in the page.
 page.set_viewport_size({'width':1920,'height':1080});page.goto(BASE_URL+'/');page.evaluate('document.fonts.ready')
 hero=page.locator('.pt-site-hero');expect(hero).to_contain_text('Engineering clarity.')
 assert hero.locator('.home-dashboard-visual').count()==0
 expect(hero.get_by_role('link',name='Discuss a project')).to_have_attribute('href','/contact')
 expect(hero.get_by_role('link',name='Explore services')).to_have_attribute('href','/services')
 assert hero.get_by_role('link',name='Discuss a project').bounding_box()['y']<900
 expect(page.get_by_role('figure',name='Client dashboard image')).to_have_count(1)
 assert page.get_by_role('figure',name='Client dashboard image').locator('button,a,input,select').count()==0
 assert page.locator('.product-demo,.demo-viewport').count()==0
 settle_capture(page);page.screenshot(path=str(REVIEW/'user-1920.png'),full_page=True,animations='disabled')
 # Real native navigation, including a service page and selected-service enquiry.
 page.locator('header').get_by_role('link',name='Services',exact=True).click();page.wait_for_url('**/services')
 filters=page.get_by_role('group',name='Filter services');expect(filters.get_by_role('button',name='All services',exact=True)).to_be_enabled()
 filters.get_by_role('button',name='Engineering & analysis',exact=True).click();expect(page.locator('.pt-site-service-card')).to_have_count(3)
 expect(page.get_by_role('status')).to_contain_text('3 services')
 filters.get_by_role('button',name='Inspection & surveys',exact=True).click();expect(page.locator('.pt-site-service-card')).to_have_count(3)
 filters.get_by_role('button',name='All services',exact=True).click();expect(page.locator('.pt-site-service-card')).to_have_count(6)
 page.locator('.pt-site-service-card').first.click();page.wait_for_url('**/services/transmission-line-modelling')
 page.get_by_role('link',name='Discuss this service').click();page.wait_for_url('**/contact?service=transmission-line-modelling')
 expect(page.get_by_label('Service of interest',exact=True)).to_have_value('transmission-line-modelling')
 expect(page.get_by_role('button',name='Prepare enquiry')).to_be_enabled()
 page.get_by_label('Your name',exact=True).fill('Jordan Test');page.get_by_label('Work email',exact=True).fill('jordan@example.invalid')
 page.get_by_label('Organisation',exact=False).fill('Engineering test team');page.get_by_label('Project details',exact=True).fill('Please discuss a line model, terrain & review of <available> survey data.')
 page.get_by_role('button',name='Prepare enquiry').click();expect(page.get_by_role('heading',name='Your enquiry is ready.')).to_be_visible()
 expect(page.get_by_label('Prepared enquiry')).to_contain_text('jordan@example.invalid')
 mail=page.get_by_role('link',name='Open email app').get_attribute('href');parsed=urlparse(mail);assert parsed.scheme=='mailto' and parsed.path=='vnr@powertekecp.com'
 payload=parse_qs(parsed.query);assert 'Transmission line modelling' in payload['subject'][0] and '<available>' in payload['body'][0]
 page.get_by_role('button',name='Copy enquiry').click();expect(page.get_by_role('status')).to_contain_text('Enquiry copied')
 settle_capture(page);page.screenshot(path=str(REVIEW/'contact-prepared-desktop.png'),full_page=True,animations='disabled')
 page.get_by_role('button',name='Edit your enquiry').click();expect(page.get_by_label('Your name',exact=True)).to_have_value('Jordan Test')
 # Mobile navigation works from every page, closes with Escape, and returns focus.
 page.set_viewport_size({'width':390,'height':950});page.get_by_role('button',name='Open navigation menu').click()
 mobile=page.get_by_role('navigation',name='Mobile navigation');expect(mobile).to_be_visible();page.keyboard.press('Escape');expect(mobile).to_be_hidden();expect(page.get_by_role('button',name='Open navigation menu')).to_be_focused()
 page.get_by_role('button',name='Open navigation menu').click();mobile.get_by_role('link',name='About Powertek').click();page.wait_for_url('**/about')
 # Theme remains consistent across public routes. Hero imagery stays readable in either mode.
 page.get_by_role('button',name='Switch to dark mode').click();page.goto(BASE_URL+'/');assert page.locator('html').get_attribute('data-theme')=='dark'
 page.set_viewport_size({'width':1440,'height':1000});settle_capture(page);page.screenshot(path=str(REVIEW/'home-dark.png'),full_page=True,animations='disabled')
 for path in ['/services','/services/thermal-ir-surveys','/about','/process','/contact']:
  page.goto(BASE_URL+path);assert page.locator('html').get_attribute('data-theme')=='dark'
  for width in [320,768,1920]:page.set_viewport_size({'width':width,'height':1000});no_overflow(page)
  page.set_viewport_size({'width':390,'height':950});settle_capture(page);page.screenshot(path=str(REVIEW/(path.strip('/').replace('/','-')+'-dark-mobile.png')),full_page=True,animations='disabled')
 # Reduced-motion users receive static content. Public image requests remain local.
 page.emulate_media(reduced_motion='reduce');page.goto(BASE_URL+'/');expect(page.locator('.pt-site-hero-photo')).to_be_visible()
 assert page.locator('.pt-site-hero-photo').evaluate('e=>getComputedStyle(e).animationName')=='none'
 page.locator('.pt-site-faq-list summary').first.click();expect(page.locator('.pt-site-faq-list details').first).to_have_attribute('open','')
 sitemap=context.request.get(BASE_URL+'/sitemap.xml');assert sitemap.status==200
 locations=[n.text for n in ET.fromstring(sitemap.text()).findall('{*}url/{*}loc')];assert all('https://powertek-app.vercel.app'+path in locations for path in routes if path!='/credits')
 assert context.request.get(BASE_URL+'/services/not-a-service').status==404
 assert not private,private
 assert not errors,errors
 context.close();browser.close();print('Public website checks passed: 12 routes, canonical metadata, native navigation, 6 service pages and filtering, client-only static graphic, safe mailto draft/copy/edit, mobile navigation, light/dark persistence, reduced motion, sitemap/404 and 320–1920px layouts. No private requests or messages sent.')
