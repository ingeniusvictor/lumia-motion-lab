import assert from 'node:assert/strict';
import {mixamoBoneName} from './mixamo-retarget.js';
for(const [src,dst] of [
 ['mixamorigRightArm.quaternion','rightUpperArm'],
 ['mixamorig:RightForeArm.quaternion','rightLowerArm'],
 ['mixamorigLeftHand.quaternion','leftHand'],
 ['mixamorig:LeftHandIndex2.quaternion','leftIndexIntermediate'],
 ['mixamorigRightHandThumb3.quaternion','rightThumbDistal'],
 ['mixamorigSpine2.quaternion','upperChest'],
])assert.equal(mixamoBoneName(src),dst,src);
// Head is deliberately excluded: the existing Lumia head/eye system owns it.
assert.equal(mixamoBoneName('mixamorigHead.quaternion'), null);
assert.equal(mixamoBoneName('unknown.quaternion'),null);
console.log('Mixamo naming tests PASS: 8 checks');
