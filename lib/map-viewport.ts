export type MapPoint={longitude:number;latitude:number};
export const clampMap=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function worldPoint(lon:number,lat:number,zoom:number){
 const scale=256*2**zoom,sin=Math.sin(clampMap(lat,-85.0511,85.0511)*Math.PI/180);
 return {x:(lon+180)/360*scale,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale};
}
export function pointToLonLat(x:number,y:number,zoom:number){
 const scale=256*2**zoom,n=Math.PI-2*Math.PI*y/scale;
 return {lon:((x/scale*360)%360+360)%360-180,lat:180/Math.PI*Math.atan(Math.sinh(n))};
}
export function fitSurveyViewport(points:MapPoint[],width:number,height:number){
 const valid=points.filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180);
 if(!valid.length)return {zoom:2,center:{lon:0,lat:0}};
 const coords=valid.map(p=>worldPoint(p.longitude,p.latitude,0));
 const xs=coords.map(p=>p.x),ys=coords.map(p=>p.y);
 // Choose the shorter longitude extent for surveys crossing the date line.
 const wrap=Math.max(...xs)-Math.min(...xs)>128;
 const horizontal=wrap?xs.map(x=>x<128?x+256:x):xs;
 const minX=Math.min(...horizontal),maxX=Math.max(...horizontal),minY=Math.min(...ys),maxY=Math.max(...ys);
 const spanX=maxX-minX,spanY=maxY-minY;
 const scale=Math.min(spanX>1e-10?Math.max(80,width-112)/spanX:Infinity,spanY>1e-10?Math.max(80,height-112)/spanY:Infinity);
 const zoom=Number.isFinite(scale)?clampMap(Math.floor(Math.log2(scale)),2,19):19;
 return {zoom,center:pointToLonLat((minX+maxX)/2,(minY+maxY)/2,0)};
}
export function mapPixelX(lon:number,centerLon:number,zoom:number,width:number){
 const scale=256*2**zoom,delta=worldPoint(lon,0,zoom).x-worldPoint(centerLon,0,zoom).x;
 return ((delta+scale/2)%scale+scale)%scale-scale/2+width/2;
}
