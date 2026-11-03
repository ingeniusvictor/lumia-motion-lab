import assert from 'node:assert/strict';
import {motionCatalog,animationLibrary} from './motion-library-catalog.js';
assert.equal(motionCatalog.length,17);
assert.equal(new Set(motionCatalog.map(c=>c.id)).size,17);
assert.equal(animationLibrary.talking.file,'Talking.fbx');
assert.equal(animationLibrary.talking.loop,true);
assert.equal(animationLibrary.walking.fullBody,true);
assert.equal(animationLibrary.walking.file,'Walking in place.fbx');
assert.equal(animationLibrary.walkingforward.file,'Walking adelante.fbx');
assert.equal(animationLibrary.walkingforward.loop,false);
assert.equal(animationLibrary.walkingforward.fullBody,true);
assert.equal(animationLibrary.walkingcircle.file,'Walk In Circle.fbx');
assert.equal(animationLibrary.walkingcircle.fullBody,true);
assert.equal(animationLibrary.walkingcircle.loop,false);
for(const c of motionCatalog){assert.ok(c.path.startsWith('./clips/'));assert.ok(['conversacion','emociones','movimiento'].includes(c.category));}
console.log(JSON.stringify({PASS:true,total:motionCatalog.length,categories:[...new Set(motionCatalog.map(c=>c.category))]}));
