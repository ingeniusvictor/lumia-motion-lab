import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleCircleMotion,createCircleWalkController} from './walking-circle.js';
const m=JSON.parse(fs.readFileSync(new URL('./walking-circle-motion.json',import.meta.url),'utf8'));
const k=m.keys;
assert.equal(m.rig_bones,155);
assert.equal(k.length,377);
assert.ok(m.duration_s>12&&m.duration_s<13);
assert.ok(m.closed_loop_error_m<0.005);
assert.ok(Math.abs(Math.abs(m.turn_degrees)-360)<8);
const p0=sampleCircleMotion(k,0),p1=sampleCircleMotion(k,m.duration_s);
assert.ok(Math.hypot(p0.x-p1.x,p0.z-p1.z)<0.005);
const ctl=createCircleWalkController(k);ctl.begin({x:3,z:-2,yaw:.4});
let last=null,displacement=0,maxRadius=0;
for(let i=0;i<=900;i++){
 const t=m.duration_s*(i/900),q=ctl.advance(t);
 assert.ok(q&&Number.isFinite(q.x)&&Number.isFinite(q.z)&&Number.isFinite(q.yaw));
 if(last)displacement+=Math.hypot(q.x-last.x,q.z-last.z);
 maxRadius=Math.max(maxRadius,Math.hypot(q.x-3,q.z+2));last=q;
}
assert.equal(ctl.active,false);
assert.ok(Math.hypot(last.x-3,last.z+2)<.005);
assert.ok(Math.abs(((last.yaw-.4)/(2*Math.PI)))>.9);
assert.ok(displacement>8&&displacement<20);
assert.ok(maxRadius>2.5&&maxRadius<3.8);
ctl.begin({x:0,z:0,yaw:0});ctl.advance(1);ctl.halt();assert.equal(ctl.advance(2),null);
console.log(JSON.stringify({PASS:true,bones:m.rig_bones,duration:m.duration_s,frames:k.length,
  turn_degrees:m.turn_degrees,total_distance_m:+displacement.toFixed(2),max_distance_from_start_m:+maxRadius.toFixed(2)},null,2));
