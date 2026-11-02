import assert from 'node:assert/strict';
import {DEFAULT_CLIP_SPEED,clampClipSpeed,clipDurationAtSpeed,secondsRemaining,speedLabel} from './animation-speed.js';
assert.equal(DEFAULT_CLIP_SPEED,0.70);
assert.equal(clampClipSpeed('0.5'),0.5);
assert.equal(clampClipSpeed(-2),0.35);
assert.equal(clampClipSpeed(12),1.5);
assert.equal(clampClipSpeed(NaN),0.70);
assert.equal(speedLabel(0.75),'75%');
assert.ok(Math.abs(clipDurationAtSpeed(.63,.70,2)-1.8)<1e-8); // 2x Waving at 70%
assert.ok(Math.abs(clipDurationAtSpeed(5.93,.5,1)-11.86)<1e-8); // Talking half speed
assert.equal(clipDurationAtSpeed(4.43,.65,Infinity),Infinity);
assert.equal(secondsRemaining(1.26,1.26,.5),0);
assert.ok(Math.abs(secondsRemaining(1.26,.96,.5)-.60)<1e-9);
assert.ok(secondsRemaining(1.26,.10,.5)>secondsRemaining(1.26,.10,1));
console.log(JSON.stringify({PASS:true,range:[0.35,1.5],defaultSpeed:DEFAULT_CLIP_SPEED,waving2xAt70pct:clipDurationAtSpeed(.63,.7,2),talkingAt50pct:clipDurationAtSpeed(5.93,.5),message:'solo FBX, voz y VRM sin cambios'},null,2));
