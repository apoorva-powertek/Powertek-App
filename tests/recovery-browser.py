"""Password recovery with real SDK and intercepted Auth responses; no emails sent."""
from browser_fixtures import *
from playwright.sync_api import expect

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 # Recovery requests always specify the password route, from either sign-in page.
 for path in ['/admin','/portal']:
  context=browser.new_context()
  setup(context)
  context.add_init_script("if(!sessionStorage.getItem('recovery-fixture-cleared')){localStorage.clear();sessionStorage.setItem('recovery-fixture-cleared','1')}")
  page=context.new_page();page.goto(BASE_URL+path)
  page.get_by_role('button',name='Forgot password?',exact=True).click()
  page.get_by_label('Work email',exact=True).fill('test@example.com')
  with page.expect_request('**/auth/v1/recover*') as sent:
   page.get_by_role('button',name='Send reset email',exact=True).click()
  assert sent.value.post_data_json['email']=='test@example.com'
  from urllib.parse import urlparse,parse_qs
  assert parse_qs(urlparse(sent.value.url).query)['redirect_to']==[BASE_URL+'/reset-password']
  expect(page.get_by_role('status')).to_contain_text('reset email')
  context.close()
 # A token-hash email works in a fresh browser, without a prior local session.
 context=browser.new_context(viewport=dict(width=375,height=950));session=setup(context)
 context.add_init_script("if(!sessionStorage.getItem('recovery-fixture-cleared')){localStorage.clear();sessionStorage.setItem('recovery-fixture-cleared','1')}")
 verified=[];updates=[]
 def verify(route):
  body=route.request.post_data_json;assert body['token_hash']=='synthetic-recovery-hash' and body['type']=='recovery'
  verified.append(body)
  route.fulfill(status=200,content_type='application/json',body=json.dumps(session))
 context.route('**/auth/v1/verify',verify)
 page=context.new_page();page.goto(BASE_URL+'/reset-password?token_hash=synthetic-recovery-hash&type=recovery')
 page.get_by_role('heading',name='Choose a new password').wait_for();no_overflow(page)
 assert page.url==BASE_URL+'/reset-password' and len(verified)==1
 page.get_by_label('New password',exact=True).fill('Synthetic-password-12')
 page.get_by_label('Confirm password',exact=True).fill('Different-password-12')
 page.get_by_role('button',name='Update password',exact=True).click()
 expect(page.get_by_role('alert')).to_contain_text('do not match')
 page.get_by_label('Confirm password',exact=True).fill('Synthetic-password-12')
 with page.expect_request(lambda r:'/auth/v1/user' in r.url and r.method=='PUT') as update:
  page.get_by_role('button',name='Update password',exact=True).click()
 assert update.value.post_data_json['password']=='Synthetic-password-12'
 page.wait_for_url('**/admin');page.get_by_role('heading',name='A clearer view of everything.').wait_for()
 context.close()
 # Legacy implicit email callbacks must retain intent through root/admin/portal.
 for path in ['/','/portal','/admin']:
  context=browser.new_context();session=setup(context);context.add_init_script("if(!sessionStorage.getItem('recovery-fixture-cleared')){localStorage.clear();sessionStorage.setItem('recovery-fixture-cleared','1')}")
  page=context.new_page()
  page.goto(BASE_URL+path+'#access_token='+session['access_token']+'&refresh_token=synthetic-refresh&type=recovery&expires_in=3600&token_type=bearer')
  page.get_by_role('heading',name='Choose a new password').wait_for()
  assert page.url==BASE_URL+'/reset-password'
  page.reload();page.get_by_role('heading',name='Choose a new password').wait_for()
  context.close()
 # PKCE exchange runs exactly once, before the normal admin redirect can run.
 context=browser.new_context();session=setup(context);context.add_init_script("localStorage.clear();localStorage.setItem('sb-goqvlgiqqrglyjgpktav-auth-token-code-verifier','synthetic-verifier/PASSWORD_RECOVERY')")
 exchanged=[]
 def exchange(route):
  exchanged.append(route.request.post_data_json)
  route.fulfill(status=200,content_type='application/json',body=json.dumps(session))
 context.route('**/auth/v1/token?grant_type=pkce',exchange)
 page=context.new_page();page.goto(BASE_URL+'/reset-password?code=synthetic-code')
 page.get_by_role('heading',name='Choose a new password').wait_for();assert len(exchanged)==1
 assert exchanged[0]['auth_code']=='synthetic-code'
 context.close()
 # Expired callbacks never fall back to an existing signed-in admin session.
 for path in ['/','/reset-password']:
  context=browser.new_context();setup(context)
  page=context.new_page();page.goto(BASE_URL+path+'#error=access_denied&error_code=otp_expired&error_description=Expired')
  page.get_by_role('heading',name='Request a fresh reset link').wait_for()
  assert page.url==BASE_URL+'/reset-password'
  assert page.get_by_role('heading',name='Choose a new password').count()==0
  page.get_by_role('button',name='Request a new reset email',exact=True).click()
  page.get_by_role('button',name='Send reset email',exact=True).wait_for();context.close()
 context=browser.new_context();setup(context);context.add_init_script("if(!sessionStorage.getItem('recovery-fixture-cleared')){localStorage.clear();sessionStorage.setItem('recovery-fixture-cleared','1')}")
 context.route('**/auth/v1/verify',lambda route:route.fulfill(status=403,content_type='application/json',body=json.dumps(dict(code='otp_expired',msg='Token has expired'))))
 page=context.new_page();page.goto(BASE_URL+'/reset-password?token_hash=used-hash&type=recovery')
 page.get_by_role('heading',name='Request a fresh reset link').wait_for();context.close()
 context=browser.new_context();page=context.new_page();page.goto(BASE_URL+'/reset-password')
 page.get_by_role('heading',name='Request a fresh reset link').wait_for();context.close()
 browser.close()
 print('Recovery browser checks passed: request destinations, fresh-browser token verification, password update/admin redirect, legacy root/admin/portal callbacks, reload, PKCE exchange, expired/used/missing links and existing-session error handling. No emails or real password updates occurred.')
