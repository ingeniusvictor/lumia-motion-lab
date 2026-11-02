import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('./viewer.js',import.meta.url),'utf8');
const catalog=fs.readFileSync(new URL('./motion-library-catalog.js',import.meta.url),'utf8');
const motion=fs.readFileSync(new URL('./motion-intelligence.js',import.meta.url),'utf8');
for(const id of ['intelligence-enabled','intelligence-variety','intelligence-status','walk-auto-thinking','mixamo-speed','library-auto-talk']){
 assert(html.includes(`id="${id}"`),`Falta control ${id}`);
}
assert(js.includes('MotionIntelligence'));
assert(js.includes('directorTick();'));
assert(js.includes('getMotionIntelligence()'));
assert(js.includes('manualLock'));
assert(js.includes('setMotionVariety'));
assert(js.includes('requestId===autoRequestId'));
assert(js.includes('clampWhenFinished=!loop'));
assert(js.includes("getVisemeCue()"));
assert(js.includes("vrm.update(dt)"));
assert(js.includes("new FBXLoader().loadAsync(cfg.path)"));
assert(catalog.includes('Walk In Circle.fbx'));
assert(catalog.includes('Talking.fbx'));
assert(motion.includes('this.emotionConsumed'));
assert(!js.includes("if(started&&key==='walkingforward'forwardWalkController"));
console.log('QA integración v0.8.5: 19 verificaciones de estructura PASS');
