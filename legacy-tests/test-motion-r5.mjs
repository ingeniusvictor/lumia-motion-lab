import assert from 'node:assert/strict';
import fs from 'node:fs';
import {motionCatalog,animationLibrary} from './motion-library-catalog.js';
import {DANCE_ROUTINES,DanceSequenceClock,prepareDancePlan} from './dance-choreography.js';
import {MotionIntelligence} from './motion-intelligence.js';
const html=fs.readFileSync('index.html','utf8'),viewer=fs.readFileSync('viewer.js','utf8');
assert.equal(motionCatalog.length,51);
assert.equal(motionCatalog.filter(c=>c.category==='baile').length,34);
assert.equal(new Set(motionCatalog.map(c=>c.id)).size,51);
assert.equal(animationLibrary.listening.file,'Head Gesture.fbx');
assert.equal(animationLibrary.listening.includeHead,true);
assert.equal(animationLibrary.listening.loop,true);
assert.equal(animationLibrary.idle.file,'Idle.fbx');
assert.equal(animationLibrary.nails.file,'Dwarf Idle.fbx');
assert.ok(fs.existsSync('clips/Head Gesture.fbx'));
const director=new MotionIntelligence({idleDelay:0});
assert.equal(director.decide({now:0,state:'idle'})?.id,'idle');
assert.equal(director.decide({now:1,state:'listening'})?.id,'listening');
assert.equal(director.decide({now:2,state:'listening',active:true,activeId:'listening'}),null);
assert.ok(!DANCE_ROUTINES.some(r=>director.decide({now:3,state:'speaking',active:true,activeId:'talking'})?.id===r.id));
assert.equal(DANCE_ROUTINES.length,3);
const ids=new Set();
for(const routine of DANCE_ROUTINES){
 assert.ok(routine.steps.length>=5);
 const durations=routine.steps.map(id=>{
  assert.ok(animationLibrary[id],`${id} missing`);
  assert.equal(animationLibrary[id].category,'baile');
  assert.ok(fs.existsSync('clips/'+animationLibrary[id].file));
  ids.add(id);return 2.5;
 });
 const plan=prepareDancePlan(routine,durations,animationLibrary);
 assert.equal(plan.length,routine.steps.length);
 assert.equal(plan.at(-1).blend,0);
 assert(plan.slice(0,-1).every(x=>x.blend>0&&x.blend<1));
 const clock=new DanceSequenceClock(plan);let transitions=0,finished=0;
 for(let i=0;i<2000;i++){
  const event=clock.advance(.08);
  if(event?.type==='transition')transitions++;
  if(event?.type==='finished'){finished++;break;}
 }
 assert.equal(transitions,plan.length-1);
 assert.equal(finished,1);
 assert.equal(clock.advance(.1),null);
}
for(const name of ['dance-start','dance-pause','dance-stop','dance-routine','dance-sequence-status'])assert.ok(html.includes(`id="${name}"`));
assert.ok(viewer.includes('prev.crossFadeTo(action,overlap,false)'),'coreografía exige transición entre actions');
assert.ok(viewer.includes('new THREE.AnimationMixer(vrm.scene)'));
assert.ok(viewer.includes('danceState.paused'));
assert.ok(viewer.includes("mixamoState.source==='listening'"),'no sobrescribir cabeza de clip Escuchando');
assert.ok(fs.readFileSync('mixamo-retarget.js','utf8').includes("permitted.add('head')"));
console.log(JSON.stringify({PASS:true,clips:51,baileClips:34,originalDanceClipsInRoutines:ids.size,routines:DANCE_ROUTINES.map(x=>({id:x.id,clips:x.steps.length})),listenAutoplay:true,speedAndPause:true}));
