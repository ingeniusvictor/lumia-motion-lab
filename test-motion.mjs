import assert from 'node:assert/strict';
import {NaturalMotionCore} from './motion-core.js';
const opts={live:true,blink:true,gaze:true,head:true,expression:true,intensity:.65,
 gazeMode:'cursor',cursorInside:true,cursorX:.7,cursorY:1,
 gazePower:.95,gazeResponse:12,headFollow:.8,headPower:.9,headResponse:7.5};
const motion=new NaturalMotionCore(()=>.41);
const rad=180/Math.PI;
const reports={};
for(const behavior of ['idle','listening','thinking','speaking']){
 let state;
 for(let i=0;i<150;i++){
  state=motion.step(1/60,{...opts,behavior});
  for(const [k,v] of Object.entries(state))if(typeof v==='number')assert.ok(Number.isFinite(v),`${behavior}:${k}`);
  assert.ok(Math.abs(state.headYaw*rad)<=22.01);
  assert.ok(state.headPitch*rad<=20.01&&state.headPitch*rad>=-15.01);
 }
 reports[behavior]={headUpDeg:+(state.headPitch*rad).toFixed(2),headYawDeg:+(state.headYaw*rad).toFixed(2),eyesUp:+state.gazeY.toFixed(2)};
}
assert.ok(reports.listening.headUpDeg>7,'Cursor in upper screen should lift head');
assert.ok(reports.thinking.headUpDeg>4,'Thinking should look up');
let maxUp=0;
for(let i=0;i<180;i++){
 const s=motion.step(1/60,{...opts,behavior:'idle',gazeMode:'ambient',cursorInside:false,lookUp:true});
 maxUp=Math.max(maxUp,s.headPitch*rad);
}
assert.ok(maxUp>10,'Look up button should lift head >10deg');
let s;
for(let i=0;i<200;i++)s=motion.step(1/60,{...opts,live:false});
assert.ok(Math.abs(s.headPitch*rad)<.01&&Math.abs(s.gazeY)<.001,'Disabled live must return to neutral');
const blink=new NaturalMotionCore(()=>.45);blink.requestBlink();let peak=0;
for(let i=0;i<40;i++)peak=Math.max(peak,blink.step(1/60,opts).blink);
assert.ok(peak>.95);
console.log(JSON.stringify({PASS:true,stateReports:reports,upButtonMaxDeg:+maxUp.toFixed(2),blinkPeak:+peak.toFixed(3)},null,2));
