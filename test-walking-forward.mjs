import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleForwardWalk,createForwardWalkController} from './walking-forward.js';
const meta=JSON.parse(fs.readFileSync(new URL('./walking-forward-motion.json',import.meta.url),'utf8'));
const keys=meta.keys;
assert.equal(keys.length,42);
assert.ok(meta.duration_s>1 && meta.duration_s<2);
assert.ok(meta.distance_m>1.4&&meta.distance_m<1.6);
assert.equal(sampleForwardWalk(keys,-1),0);
assert.ok(Math.abs(sampleForwardWalk(keys,meta.duration_s)-meta.distance_m)<.0001);
let last=0,total=0;
const ctl=createForwardWalkController(keys);ctl.begin();
for(let i=1;i<=120;i++){
 const d=ctl.advance(i/60);
 assert.ok(d>=-0.01,'Forward curve should not jump backwards');
 total+=d;last+=d;
}
assert.ok(Math.abs(total-meta.distance_m)<.0001);
assert.equal(ctl.active,false);
ctl.begin();ctl.advance(.4);ctl.halt();assert.equal(ctl.advance(.8),0);
console.log(JSON.stringify({PASS:true,frames:keys.length,seconds:meta.duration_s,forward_m:meta.distance_m}));
