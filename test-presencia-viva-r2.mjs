import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BodyPresenceCore, PRESENCE_DEFAULTS} from './body-presence.js';
const deg=v=>v*180/Math.PI;
assert.equal(PRESENCE_DEFAULTS.enabled,true);
const core=new BodyPresenceCore();
let frames=[];
for(let n=0;n<900;n++)frames.push(core.step(1/60,{behavior:'idle',enabled:true,idleLevel:65,listeningLevel:80}));
assert(frames.at(-1).idleWeight>.99);
assert(frames.at(-1).listeningWeight<.01);
const range=(a,k)=>Math.max(...a.map(f=>deg(f.offsets[k])))-Math.min(...a.map(f=>deg(f.offsets[k])));
assert(range(frames.slice(120),'chestX')>1,'breathing should be observable');
assert(range(frames.slice(120),'leftUpperArmZ')>1.3,'shoulder micro movement should be observable');
let prev=frames.at(-1);
let listen=[];
for(let n=0;n<900;n++){
 const next=core.step(1/60,{behavior:'listening',enabled:true,idleLevel:65,listeningLevel:80});
 assert(Math.abs(deg(next.offsets.chestX-prev.offsets.chestX))<.28,'no sudden torso jump');
 assert(Math.abs(deg(next.headPitch-prev.headPitch))<.16,'no sudden head snap');
 prev=next;listen.push(next);
}
assert(listen.at(-1).listeningWeight>.99);
assert(listen.at(-1).idleWeight<.01);
assert(Math.max(...listen.map(f=>deg(f.headPitch)))>1.15,'listening subtle nod visible');
assert(range(listen.slice(120),'leftHandX')>1.6,'listening must show hands activity');
for (const disabled of [{enabled:false},{live:false},{bodyMotion:false},{bodyPose:'tpose'}]){
 let p=new BodyPresenceCore(),last;
 for(let i=0;i<120;i++)last=p.step(1/60,{behavior:'listening',...disabled});
 assert(Object.values(last.offsets).every(v=>Math.abs(v)<1e-7),'disabled should not move body');
 assert.equal(last.headPitch,0);
}
const html=fs.readFileSync('./index.html','utf8');
const viewer=fs.readFileSync('./viewer.js','utf8');
for (const id of ['presence-enabled','presence-idle','presence-listening','presence-status']){
 assert(html.includes(`id="${id}"`),`Missing UI ${id}`);assert(viewer.includes(`#${id}`),`Missing listener for ${id}`);
}
assert(viewer.includes('applyBodyPose(bodyState,presenceState)'));
assert(viewer.includes('state.headPitch+presenceState.headPitch'));
assert(fs.existsSync('./INICIAR_LUMIA_SERVIDOR.py'));
console.log(JSON.stringify({PASS:true,idleChestRangeDegrees:range(frames.slice(120),'chestX').toFixed(2),idleUpperArmRangeDegrees:range(frames.slice(120),'leftUpperArmZ').toFixed(2),listeningNodMaxDegrees:Math.max(...listen.map(f=>deg(f.headPitch))).toFixed(2)}));
