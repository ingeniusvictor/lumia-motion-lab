import assert from 'node:assert/strict';
import fs from 'node:fs';
import {motionCatalog, animationLibrary} from './motion-library-catalog.js';
import {MAX_DANCE_STEPS, buildDanceRoutine,prepareDancePlan,DanceSequenceClock} from './dance-choreography.js';
import {MotionIntelligence} from './motion-intelligence.js';
const html=fs.readFileSync('index.html','utf8'),viewer=fs.readFileSync('viewer.js','utf8');
assert.equal(motionCatalog.length,17);
assert.equal(motionCatalog.filter(x=>x.category==='baile').length,0);
assert.equal(new Set(motionCatalog.map(x=>x.id)).size,17);
assert.equal(fs.readdirSync('clips').filter(x=>x.endsWith('.fbx')).length,17);
for(const item of motionCatalog){assert.ok(fs.existsSync('clips/'+item.file),item.file);}
for(const [id,file] of Object.entries({idle:'Idle.fbx',listening:'Head Gesture.fbx',thinking:'Thinking.fbx',talking:'Talking.fbx',nails:'Dwarf Idle.fbx',walking:'Walking in place.fbx',walkingforward:'Walking adelante.fbx',walkingcircle:'Walk In Circle.fbx'}))assert.equal(animationLibrary[id].file,file);
assert.equal(MAX_DANCE_STEPS,3);
const lib={intro:{category:'baile',label:'Inicio'},move:{category:'baile',label:'Uprock'},end:{category:'baile',label:'Final'}};
assert.throws(()=>buildDanceRoutine(['','',''],lib),/al menos un movimiento/);
assert.throws(()=>buildDanceRoutine(['intro','','end'],lib),/No dejes huecos/);
assert.throws(()=>buildDanceRoutine(['intro','fake',''],lib),/válido/);
for(const [choices,durations] of [ [['intro','',''],[1.2]],[['intro','move',''],[1.2,2.3]],[['intro','move','end'],[1.2,2.3,1.5]],[['intro','intro','end'],[1.2,1.2,1.5]]]){
 const routine=buildDanceRoutine(choices,lib);
 const plan=prepareDancePlan(routine,durations,lib,.38);
 assert.equal(plan.length,durations.length);
 assert.equal(plan.at(-1).blend,0);
 const clock=new DanceSequenceClock(plan);let transitions=0,finished=0;
 for(let i=0;i<3000;i++){
  const ev=clock.advance(.012);
  if(ev?.type==='transition')transitions++;
  if(ev?.type==='finished'){finished++;break;}
 }
 assert.equal(transitions,plan.length-1);
 assert.equal(finished,1);
 assert.equal(clock.advance(1),null);
}
assert.throws(()=>prepareDancePlan({steps:['intro','move','end','intro']},[1,1,1,1],lib),/entre 1 y 3/);
for(const id of ['dance-files','dance-step-1','dance-step-2','dance-step-3','dance-blend','dance-start','dance-pause','dance-stop','dance-clear-steps','dance-clear-library','dance-order-preview'])assert.ok(html.includes(`id="${id}"`),id);
assert.ok(html.includes('multiple'));
assert.ok(!html.includes('id="dance-routine"'));
assert.ok(viewer.includes('prev.crossFadeTo(action,overlap,false)'));
assert.ok(viewer.includes('assets.map(asset=>mixer.clipAction(asset.clip.clone()))'));
assert.ok(viewer.includes('for(const action of danceState.actions)action.setEffectiveTimeScale(speed)'));
assert.ok(viewer.includes('URL.revokeObjectURL(url)'));
const director=new MotionIntelligence({idleDelay:0});
assert.equal(director.decide({now:0,state:'idle'})?.id,'idle');
assert.equal(director.decide({now:1,state:'listening'})?.id,'listening');
console.log(JSON.stringify({PASS:true,essentialAnimations:motionCatalog.length,breakdanceFiles:0,optionalDancePositions:MAX_DANCE_STEPS,fadeAndSpeed:true}));
