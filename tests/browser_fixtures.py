"""UI smoke checks using synthetic accounts and intercepted API responses.
Run: python tests/dashboard-browser.py (Playwright + Chromium required).
No messages are sent and no production Supabase data is changed.
"""
import base64
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("POWERTEK_TEST_URL", "http://127.0.0.1:5173")
OUTPUT = Path(os.environ.get("POWERTEK_TEST_OUTPUT", "/tmp/powertek-ui"))
OUTPUT.mkdir(parents=True, exist_ok=True)
PROJECTS = [
 dict(id="project-one",client_id="client-one",client_name="Northline Utilities",name="Fort Nelson Corridor",code="FN-2026",description="Transmission pole survey",location_label="Fort Nelson, British Columbia",status="active",pole_count=76,complete_count=57,attachment_count=303,created_at="2026-10-01T00:00:00Z",updated_at="2026-10-12T00:00:00Z",can_upload=True),
 dict(id="project-two",client_id="client-two",client_name="Westline Energy",name="North Grid Inspection",code="NG-2026",description="Field inspection",location_label="Northern Alberta",status="active",pole_count=120,complete_count=120,attachment_count=540,created_at="2026-10-01T00:00:00Z",updated_at="2026-10-11T00:00:00Z",can_upload=True),
 dict(id="project-three",client_id="client-one",client_name="Northline Utilities",name="Southline Expansion",code="SL-2026",description="New survey",location_label="Vancouver, British Columbia",status="active",pole_count=42,complete_count=0,attachment_count=0,created_at="2026-10-01T00:00:00Z",updated_at="2026-10-10T00:00:00Z",can_upload=True),
]
def setup(context, role="admin", invite=False):
 user = dict(id="10000000-0000-4000-8000-000000000001",email="test@example.com",email_confirmed_at="2026-10-01T00:00:00Z",aud="authenticated",role="authenticated",app_metadata={},user_metadata={})
 encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")
 token = encode({"alg":"HS256","typ":"JWT"})+"."+encode({"sub":user["id"],"exp":int(time.time())+3600})+"."+encode("synthetic-signature")
 session = dict(access_token=token,refresh_token="synthetic-refresh",token_type="bearer",expires_at=int(time.time())+3600,expires_in=3600,user=user)
 context.add_init_script("localStorage.setItem('sb-goqvlgiqqrglyjgpktav-auth-token',"+json.dumps(json.dumps(session))+");")
 profile = dict(id="test-user",email=user["email"],display_name="Alex Morgan",role=role,status="active")
 dashboard_user = dict(id="test-user",email=user["email"],displayName="Alex Morgan",authUserId=user["id"],role=role,status="active",permissions={"manageClients":role=="staff"})
 clients = [dict(id="client-one",name="Northline Utilities",code="NLU",status="active",project_count=2),dict(id="client-two",name="Westline Energy",code="WLE",status="active",project_count=1)]
 directory = [dict(id="test-user",email=user["email"],display_name="Alex Morgan",role="admin",status="active",invitation_status="accepted",project_names="",project_count=0,assignments=[]),dict(id="client-person",email="engineer@example.com",display_name="Jordan Chen",role="client",status="active",invitation_status="sent",project_names="Fort Nelson Corridor",project_count=1,assignments=[{"projectId":"project-one","canUpload":False}])]
 def supabase(route):
  url=route.request.url
  if "link_current_portal_user" in url: payload=[profile]
  elif "/auth/v1/user" in url: payload=user
  elif "/auth/v1/token" in url: payload=session
  else: payload={}
  route.fulfill(status=200,content_type="application/json",body=json.dumps(payload))
 context.route("**/goqvlgiqqrglyjgpktav.supabase.co/**",supabase)
 context.route("**/api/dashboard",lambda route:route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(user=dashboard_user,projects=PROJECTS if role=="admin" else [PROJECTS[0]],clients=clients if role in ["admin","staff"] else [],users=directory if role=="admin" else []))))
 context.route("**/api/admin/users",lambda route:route.fulfill(status=200,content_type="application/json",body=json.dumps(dict(id="invite-test",invitationSent=True))))
 return session

def no_overflow(page):
 assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Page has horizontal overflow"
