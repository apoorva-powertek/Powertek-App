"""Navigation regression checks with synthetic accounts and intercepted writes."""
from browser_fixtures import *
from playwright.sync_api import expect
from urllib.parse import urlparse,parse_qs

POLES=[dict(id='pole-one',projectId='project-one',poleName='P-1',latitude=30,longitude=-90,elevationM=15,topHeightM=10,poleHeightFt=40,poleClass='3',status='complete',reviewStage='uploaded',updatedAt='2026-11-02T12:00:00Z',imageFilename='P-1.png',imageWidth=1,imageHeight=1,sourceJsonFilename=None,modelVersion=None,toolName=None,baseX=None,baseY=None,topX=None,topY=None,attachments=[]),dict(id='pole-two',projectId='project-one',poleName='P-2',latitude=31,longitude=-91,elevationM=15,topHeightM=None,poleHeightFt=None,poleClass=None,status='location_only',reviewStage='draft',updatedAt='2026-11-02T12:00:00Z',imageFilename=None,imageWidth=None,imageHeight=None,sourceJsonFilename=None,modelVersion=None,toolName=None,baseX=None,baseY=None,topX=None,topY=None,attachments=[])]
def configure(context,role='admin'):
 setup(context,role)
 state={'photoReady':False,'images':0,'reportError':False}
 def records(route):
  if state['reportError']:
   route.fulfill(status=503,content_type='application/json',body='{"error":"Report service unavailable"}')
  else:route.fulfill(status=200,content_type='application/json',body=json.dumps(dict(project={**PROJECTS[0],'client_code':'NORTH'},canEdit=role!='client',poles=POLES)))
 context.route('**/api/projects/project-one/poles',records)
 def image(route):
  state['images']+=1
  if state['photoReady']:
   route.fulfill(status=200,content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII='))
  else:route.fulfill(status=404,content_type='application/json',body='{"error":"Original photo is unavailable"}')
 context.route('**/api/projects/project-one/poles/pole-one/image',image)
 context.route('**/*.arcgisonline.com/**',lambda route:route.abort())
 context.route('**/api/activity**',lambda route:route.fulfill(status=200,content_type='application/json',body='{"events":[],"next":null}'))
 return state

def tab(page,name):
 if page.get_by_role('button',name='Open navigation',exact=True).is_visible():
  page.get_by_role('button',name='Open navigation',exact=True).click()
 page.get_by_role('navigation',name='Workspace navigation').get_by_role('button',name=name,exact=True).click()

def url_tab(page):return parse_qs(urlparse(page.url).query).get('tab',['overview'])[0]

