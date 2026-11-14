import assert from 'node:assert/strict';
import {R9MotionPilot} from './r9-motion-pilot.js';
import {parseR9MotionIntent} from './r9/intent-contract.js';
import {inferR9CueFromSpokenPhrase} from './r9/spoken-director.js';

let checks=0;
function ok(expression,message){checks++;assert(expression,message);}
function eq(actual,expected,message){checks++;assert.equal(actual,expected,message);}

const r9=new R9MotionPilot();
eq(r9.enabled,false,'R9 must be OFF by default');
eq(r9.begin('Sí, claro',{sessionId:1}),0,'OFF: no plans');
eq(r9.step(.016,{speaking:true}).kind,null,'OFF: no gesture');
r9.setEnabled(true);
eq(r9.begin('Sí, claro. Primero te explico. Felicidades.',{sessionId:2}),3,'recognize three phrases');
ok(!r9.boundary(10,999),'ignore wrong speech session');
ok(r9.boundary(3,2),'accept valid TTS word boundary');
ok(!r9.boundary(1,2),'prevent retrograde TTS boundary');
let seen=false;
for(let i=0;i<120;i++){
 const p=r9.step(.016,{speaking:true});
 if(p.kind){
  seen=true;
  ok(Math.abs(p.head.pitch)<=.075&&Math.abs(p.head.yaw)<=.075&&Math.abs(p.head.roll)<=.055,'head bounds');
  ok(Object.values(p.body).every(x=>Number.isFinite(x)&&Math.abs(x)<=.09),'body bounds');
 }
}
ok(seen,'R9 should produce audible synchronized motion');
eq(r9.snapshot().lastCue,'affirm','first audible cue matches first phrase');
const manual=r9.step(.016,{speaking:true,manual:true});
eq(manual.kind,null,'manual FBX wins');
eq(manual.weight,0,'no residual during manual FBX');
eq(r9.step(.016,{speaking:true,dancing:true}).kind,null,'dance wins');
ok(!r9.end(1),'old speech end ignored');
ok(r9.end(2),'active speech end accepted');
eq(r9.step(.016,{speaking:true}).kind,null,'silence after end');
eq(r9.snapshot().speaking,false,'speech session cleared');

const b=new R9MotionPilot({enabled:true,intensity:100});
eq(b.begin('No estoy de acuerdo',{sessionId:3}),1,'detect refusal');
let deny=false;
for(let i=0;i<180;i++){
 const p=b.step(.016,{speaking:true});
 if(p.kind==='deny')deny=true;
}
ok(deny,'fallback timeline works if no browser word boundaries');
eq(b.step(.016,{speaking:false}).kind,null,'no motion without audible speech');
b.setIntensity(0);
eq(b.step(.016,{speaking:true}).weight,0,'zero intensity forces neutral');
b.setEnabled(false);
eq(b.snapshot().speaking,false,'disable cancels session');

const cue=inferR9CueFromSpokenPhrase('¡Felicidades!');
eq(cue.gesture,'celebrate','real R9 speech director');
eq(parseR9MotionIntent({...cue,gesture:'unknown'}),null,'reject unsafe gestures');
eq(parseR9MotionIntent({...cue,duration_ms:999999}),null,'reject unsafe durations');

console.log('Motion R9 independent lab: '+checks+' checks PASS (speech, bounds, interruption, manual, dance, compare).');
