"""Dashboard and authentication smoke checks. See docs/admin-and-invitations.md."""
from browser_fixtures import *

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox"])
 # Actual public entry without any mocked auth session.
 context=browser.new_context(viewport={"width":1440,"height":1000})
 page=context.new_page()
 page.goto(BASE_URL+"/admin"); page.get_by_role("button",name="Sign in to your portal").wait_for()
 assert page.get_by_role("button",name="First time? Create account").count()==0
 page.screenshot(path=str(OUTPUT/"admin-signin.png"),full_page=True)
 context.close()
 # Authenticated dashboard UI: fixtures never enter production code.
 context=browser.new_context(viewport={"width":1440,"height":1100});setup(context)
 page=context.new_page();page.goto(BASE_URL+"/admin");page.get_by_role("heading",name="A clearer view of everything.").wait_for()
 page.get_by_role("cell",name="Fort Nelson Corridor FN-2026").wait_for()
 page.screenshot(path=str(OUTPUT/"admin-overview-light.png"),full_page=True);no_overflow(page)
 page.get_by_label("Filter by client").select_option("client-one")
 assert page.get_by_role("cell",name="North Grid Inspection").count()==0
 page.get_by_role("button",name="Filters",exact=True).click()
 page.get_by_label("Survey progress").select_option("in_progress")
 assert page.get_by_role("cell",name="Southline Expansion").count()==0
 page.get_by_role("button",name="Clear",exact=True).click()
 page.get_by_role("button",name="Projects 3",exact=True).click()
 assert page.locator(".workspace-project-card").count()==3
 page.screenshot(path=str(OUTPUT/"admin-projects-light.png"),full_page=True)
 page.get_by_role("button",name="List view",exact=True).click()
 assert page.locator(".workspace-project-card.is-list").count()==3
 page.get_by_role("button",name="Grid view",exact=True).click()
 page.get_by_role("button",name="Switch to dark mode").click();page.wait_for_timeout(250)
 assert page.locator("html").get_attribute("data-theme")=="dark"
 page.screenshot(path=str(OUTPUT/"admin-projects-dark.png"),full_page=True)
 page.reload();page.get_by_role("heading",name="A clearer view of everything.").wait_for()
 assert page.locator("html").get_attribute("data-theme")=="dark"
 page.get_by_role("button",name="Invite people",exact=True).click()
 page.get_by_label("Full name").fill("Taylor Test")
 page.get_by_label("Work email",exact=True).fill("taylor@example.com")
 page.get_by_label("Workspace role").select_option("staff")
 page.locator(".assignment-row").filter(has_text="Fort Nelson Corridor").locator("input").first.check()
 page.get_by_label("Upload / edit",exact=True).first.check()
 page.get_by_label("Manage clients",exact=False).check()
 with page.expect_request("**/api/admin/users") as request:
  page.get_by_role("button",name="Send invitation",exact=True).click()
 payload=request.value.post_data_json
 assert payload["role"]=="staff" and payload["manageClients"] and payload["sendInvite"]
 assert payload["assignments"]==[{"projectId":"project-one","canUpload":True}]
 page.get_by_role("status").wait_for()
 for width in [320,375,768,1024,1920]:
  page.set_viewport_size({"width":width,"height":1000});no_overflow(page)
  if width<760:
   page.get_by_role("button",name="Open navigation").click()
  page.get_by_role("button",name="Overview",exact=True).click();no_overflow(page)
  if width==375: page.wait_for_timeout(250);page.screenshot(path=str(OUTPUT/"admin-mobile-dark.png"),full_page=True)
  if width<760: page.get_by_role("button",name="Open navigation").click()
  page.get_by_role("button",name="Projects 3",exact=True).click();no_overflow(page)
  if width<760: page.get_by_role("button",name="Open navigation").click()
  page.get_by_role("button",name="People & access",exact=True).click();no_overflow(page)
 context.close()
 # Signing in through the client URL sends administrators to /admin.
 context=browser.new_context();setup(context)
 page=context.new_page();page.goto(BASE_URL+"/portal");page.wait_for_url("**/admin");context.close()
 # Role-gated navigation and route boundary.
 for role in ["client","staff"]:
  context=browser.new_context(viewport={"width":1280,"height":900});setup(context,role)
  page=context.new_page();page.goto(BASE_URL+"/portal");page.get_by_role("heading",name="A clearer view of everything.").wait_for()
  assert page.get_by_role("button",name="People & access",exact=True).count()==0
  if role=="client": assert page.get_by_role("button",name="Clients",exact=True).count()==0
  page.goto(BASE_URL+"/admin");page.get_by_role("heading",name="Your client workspace is ready").wait_for()
  context.close()
 # Invitation link with an authenticated session reaches password setup.
 context=browser.new_context();setup(context,"client")
 page=context.new_page();page.goto(BASE_URL+"/invite");page.get_by_role("heading",name="Set your workspace password").wait_for()
 page.get_by_label("New password").fill("Synthetic-password-12");page.get_by_label("Confirm password").fill("Different-password-12")
 page.get_by_role("button",name="Accept invitation").click();page.get_by_role("alert").filter(has_text="do not match").wait_for()
 page.get_by_label("Confirm password").fill("Synthetic-password-12")
 with page.expect_request("**/auth/v1/user") as password_request:
  page.get_by_role("button",name="Accept invitation").click()
 assert password_request.value.method=="PUT" and password_request.value.post_data_json["password"]=="Synthetic-password-12"
 page.wait_for_url("**/portal")
 context.close()
 # Missing invitation is explained, without opening a registration form.
 context=browser.new_context();page=context.new_page();page.goto(BASE_URL+"/invite")
 page.get_by_role("heading",name="Let’s get you a fresh invitation").wait_for();context.close()
 browser.close()
 print("Browser checks passed: public admin entry, filtered overview, project views, theme persistence, invitation payload, responsive reflow (320–1920px), role boundaries and invitation password setup.")
