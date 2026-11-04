import test from 'node:test';import assert from 'node:assert/strict';
import {fitSurveyViewport,worldPoint,mapPixelX} from '../lib/map-viewport.ts';
test('small survey extents fit the available canvas instead of zooming out to a region',()=>{
 const poles=[{longitude:-122.849,latitude:58.988},{longitude:-122.846,latitude:58.990}];const {zoom,center}=fitSurveyViewport(poles,1000,650);assert.ok(zoom>=17&&zoom<=19);
 for(const p of poles){const x=mapPixelX(p.longitude,center.lon,zoom,1000),y=worldPoint(p.longitude,p.latitude,zoom).y-worldPoint(center.lon,center.lat,zoom).y+325;assert.ok(x>=50&&x<=950);assert.ok(y>=50&&y<=600);}
});
test('identical locations, small screens and empty projects produce finite sensible views',()=>{
 const pole={longitude:-122.8,latitude:58.9};const single=fitSurveyViewport([pole,pole],300,380);assert.equal(single.zoom,19);assert.ok(Math.abs(single.center.lon-pole.longitude)<1e-8);assert.equal(fitSurveyViewport([],300,380).zoom,2);assert.equal(fitSurveyViewport([{longitude:NaN,latitude:100}],300,380).zoom,2);
});
test('date-line surveys use the narrow extent and wrapped marker positions',()=>{
 const points=[{longitude:179.999,latitude:0},{longitude:-179.999,latitude:.001}];const view=fitSurveyViewport(points,800,500);assert.ok(view.zoom>=17);for(const p of points)assert.ok(mapPixelX(p.longitude,view.center.lon,view.zoom,800)>0&&mapPixelX(p.longitude,view.center.lon,view.zoom,800)<800);
});
