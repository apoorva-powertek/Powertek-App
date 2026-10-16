"""Stateful management UI tests. All API writes and email sends are intercepted."""
from copy import deepcopy
from browser_fixtures import *

with sync_playwright() as playwright:
 browser=playwright.chromium.launch(executable_path="/usr/bin/chromium",args=["--no-sandbox"])
 context=browser.new_context(viewport={"width":1440,"height":1050})
 setup(context)
 context.unroute("**/api/dashboard")
 context.unroute("**/api/admin/users")
 clients=[dict(id="client-one",name="Northline Utilities",code="NLU",status="active",project_count=2),dict(id="client-two",name="Westline Energy",code="WLE",status="active",project_count=1)]
 projects=deepcopy(PROJECTS)
 users=[dict(id="test-user",email="test@example.com",display_name="Alex Morgan",role="admin",status="active",invitation_status="accepted",project_names="",project_count=0,assignments=[])]
 user=dict(id="test-user",email="test@example.com",displayName="Alex Morgan",role="admin",status="active",permissions={"manageClients":True})
 requests=[]
 def dashboard(route): route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(user=user,projects=projects,clients=clients,users=users)))
 context.route("**/api/dashboard",dashboard)
 def client_write(route):
  body=route.request.post_data_json;requests.append(("client",body))
  code=body.get("code") or body["name"].upper().replace(" ","-")
  if any(c["code"]==code and c["id"]!=body.get("id") for c in clients):
   route.fulfill(status=409,content_type="application/json",body=json.dumps(dict(error="That client code already exists. Enter a different code.",field="code")));return
  existing=next((c for c in clients if c["id"]==body.get("id")),None)
  if existing: existing.update(name=body["name"],code=code,status=body.get("status","active"));saved=existing
  else:
   saved=dict(id="client-"+str(len(clients)+1),name=body["name"],code=code,status="active",project_count=0);clients.append(saved)
  route.fulfill(status=200 if existing else 201,content_type="application/json",body=json.dumps(saved))
 context.route("**/api/admin/clients",client_write)
 def project_write(route):
  body=route.request.post_data_json;requests.append(("project",body))
  existing=next((p for p in projects if p["id"]==body.get("id")),None)
  owner=next(c for c in clients if c["id"]==body["clientId"])
  values=dict(name=body["name"],code=body.get("code") or body["name"].upper().replace(" ","-"),client_id=owner["id"],client_name=owner["name"],location_label=body.get("locationLabel",""),status=body.get("status","active"))
  if existing: existing.update(**values);saved=existing
  else:
   saved=dict(id="project-"+str(len(projects)+1),description="",pole_count=0,complete_count=0,attachment_count=0,can_upload=True,**values);projects.append(saved);owner["project_count"]+=1
  route.fulfill(status=200 if existing else 201,content_type="application/json",body=json.dumps(saved))
 context.route("**/api/admin/projects",project_write)
 def user_write(route):
  body=route.request.post_data_json;requests.append(("user",body))
  existing=next((u for u in users if u["email"]==body["email"]),None)
  values=dict(email=body["email"],display_name=body["displayName"],role=body["role"],status=body["status"],assignments=body["assignments"],project_count=len(body["assignments"]),project_names=" · ".join(p["name"] for p in projects if any(a["projectId"]==p["id"] for a in body["assignments"])),permissions=dict(manageClients=body["manageClients"]))
  if existing: existing.update(**values);saved=existing
  else: saved=dict(id="person-"+str(len(users)+1),invitation_status="sent",**values);users.append(saved)
  route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(id=saved["id"],invitationSent=body["sendInvite"])))
 context.route("**/api/admin/users",user_write)
 page=context.new_page();page.goto(BASE_URL+"/admin")
 page.get_by_role("cell",name="Fort Nelson Corridor FN-2026").wait_for()
 page.get_by_role("button",name="Clients",exact=True).click()
 form=page.get_by_role("form",name="Create client",exact=True)
 form.get_by_label("Client name",exact=True).fill("Flow Test Client")
 form.get_by_label("Client code",exact=False).fill("NLU")
 form.get_by_role("button",name="Create client",exact=True).click()
 page.get_by_role("alert").filter(has_text="already exists").wait_for()
 assert form.get_by_label("Client name",exact=True).input_value()=="Flow Test Client"
 assert form.get_by_label("Client code",exact=False).get_attribute("aria-invalid")=="true"
 assert page.locator(".management-error").evaluate("el=>el===document.activeElement")
 form.get_by_label("Client code",exact=False).fill("")
 form.get_by_role("button",name="Create client",exact=True).click()
 page.get_by_role("heading",name="Flow Test Client",exact=True).wait_for()
 assert requests[-1][1]["code"]==""
 # Editing, archiving and restoring are explicit and preserve the record.
 page.get_by_role("button",name="Edit Flow Test Client",exact=True).click()
 form=page.get_by_role("form",name="Edit client",exact=True)
 form.get_by_label("Client name",exact=True).fill("Flow Client Renamed")
 form.get_by_label("Status",exact=True).select_option("archived")
 form.get_by_role("button",name="Save client",exact=True).click()
 page.get_by_role("status").filter(has_text="updated").wait_for()
 assert page.get_by_role("heading",name="Flow Client Renamed",exact=True).count()==0
 page.get_by_label("Client status",exact=True).select_option("archived")
 page.get_by_role("button",name="Edit Flow Client Renamed",exact=True).click()
 page.get_by_role("form",name="Edit client",exact=True).get_by_label("Status",exact=True).select_option("active")
 page.get_by_role("button",name="Save client",exact=True).click()
 page.get_by_label("Client status",exact=True).select_option("active")
 page.get_by_role("heading",name="Flow Client Renamed",exact=True).wait_for()
 # Project drafts survive inline client creation and select the returned client.
 page.get_by_role("button",name="Projects 3",exact=True).click()
 page.get_by_role("button",name="New project",exact=True).click()
 form=page.get_by_role("form",name="Create project",exact=True)
 form.get_by_label("Project name",exact=True).fill("Inline Client Survey")
 page.get_by_role("button",name="Add a new client",exact=True).click()
 inline=page.get_by_role("form",name="Create client inline",exact=True)
 inline.get_by_label("New client name",exact=True).fill("Inline Utility")
 inline.get_by_role("button",name="Create and select client",exact=True).click()
 page.get_by_role("status").filter(has_text="created and selected").wait_for()
 assert form.get_by_label("Project name",exact=True).input_value()=="Inline Client Survey"
 assert form.get_by_label("Client",exact=True).input_value()==clients[-1]["id"]
 form.get_by_role("button",name="Create project",exact=True).click()
 page.get_by_role("heading",name="Inline Client Survey",exact=True).wait_for()
 page.get_by_role("button",name="Manage Inline Client Survey",exact=True).click()
 form=page.get_by_role("form",name="Edit project",exact=True)
 form.get_by_label("Project name",exact=True).fill("Renamed Survey")
 form.get_by_label("Status",exact=True).select_option("archived")
 form.get_by_role("button",name="Save project",exact=True).click()
 page.get_by_role("heading",name="Renamed Survey",exact=True).wait_for()
 # Invite now, assign later, remove assignments, and disable without deleting.
 page.get_by_role("button",name="Invite people",exact=True).click()
 form=page.get_by_role("form",name="Invite person",exact=True)
 form.get_by_label("Full name",exact=True).fill("Unassigned Person")
 form.get_by_label("Work email",exact=True).fill("person@example.invalid")
 assert form.get_by_role("button",name="Send invitation",exact=True).is_enabled()
 form.get_by_role("button",name="Send invitation",exact=True).click()
 page.get_by_role("status").filter(has_text="Invitation email sent").wait_for()
 assert requests[-1][1]["assignments"]==[] and requests[-1][1]["sendInvite"]
 page.get_by_role("button",name="Manage Unassigned Person",exact=True).click()
 page.locator(".assignment-row").filter(has_text="Fort Nelson Corridor").locator("input").first.check()
 page.get_by_role("button",name="Save permissions",exact=True).click()
 page.get_by_role("status").filter(has_text="permissions saved").wait_for()
 assert requests[-1][1]["assignments"]==[{"projectId":"project-one","canUpload":False}]
 page.locator(".assignment-row").filter(has_text="Fort Nelson Corridor").locator("input").first.uncheck()
 page.get_by_role("button",name="Save permissions",exact=True).click()
 page.get_by_role("status").filter(has_text="permissions saved").wait_for()
 assert requests[-1][1]["assignments"]==[]
 page.get_by_label("Account status",exact=True).select_option("disabled")
 page.get_by_role("button",name="Save permissions",exact=True).click()
 page.get_by_role("status").filter(has_text="permissions saved").wait_for()
 assert requests[-1][1]["status"]=="disabled" and not requests[-1][1]["sendInvite"]
 page.get_by_role("button",name="Manage Alex Morgan",exact=True).click()
 assert page.get_by_label("Account status",exact=True).is_disabled()
 assert page.get_by_label("Workspace role",exact=True).is_disabled()
 # Mobile reflow and controls in each management section.
 for width in [320,375,768,1440]:
  page.set_viewport_size({"width":width,"height":1000})
  for tab in ["Clients","People & access"]:
   if width<760: page.get_by_role("button",name="Open navigation",exact=True).click()
   page.get_by_role("button",name=tab,exact=True).click();page.wait_for_timeout(250);no_overflow(page)
  if width==375:page.screenshot(path=str(OUTPUT/"people-management-mobile.png"),full_page=True)
 page.set_viewport_size({"width":1440,"height":1050})
 page.get_by_role("button",name="Clients",exact=True).click();page.screenshot(path=str(OUTPUT/"clients-management.png"),full_page=True)
 context.close()
 # An empty workspace can still invite people and create a first client inline.
 context=browser.new_context();setup(context)
 context.unroute("**/api/dashboard")
 context.route("**/api/dashboard",lambda route:route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(user=user,projects=[],clients=[],users=[]))))
 page=context.new_page();page.goto(BASE_URL+"/admin");page.get_by_role("heading",name="Your portfolio is ready to grow").wait_for()
 page.get_by_role("button",name="Invite people",exact=True).click()
 assert page.get_by_role("button",name="Send invitation",exact=True).is_enabled()
 page.get_by_role("button",name="Projects 0",exact=True).click();page.get_by_role("button",name="New project",exact=True).click()
 assert page.get_by_role("button",name="Add a new client",exact=True).is_visible()
 context.close();browser.close()
 print("Management browser checks passed: duplicate errors retain inputs, client create/edit/archive/restore, inline client + project create/edit, invite without projects, assign/remove, disable, self-protection, and responsive/empty states. No emails or production writes occurred.")
