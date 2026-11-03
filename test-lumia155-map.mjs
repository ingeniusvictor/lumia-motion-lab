import assert from 'node:assert/strict';
import {mixamoBoneName} from './mixamo-retarget.js';
const bodyNames=['J_Bip_C_Spine','J_Bip_C_Chest','J_Bip_C_UpperChest',
  'J_Bip_L_Shoulder','J_Bip_L_UpperArm','J_Bip_L_LowerArm','J_Bip_L_Hand',
  'J_Bip_R_Shoulder','J_Bip_R_UpperArm','J_Bip_R_LowerArm','J_Bip_R_Hand'];
const fingers=[];
for(const side of ['L','R'])for(const finger of ['Thumb','Index','Middle','Ring','Little'])for(let n=1;n<=3;n++)fingers.push(`J_Bip_${side}_${finger}${n}`);
for(const name of [...bodyNames,...fingers])assert.ok(mixamoBoneName(name),`No mapping for ${name}`);
assert.equal(mixamoBoneName('J_Bip_L_UpperArm'),'leftUpperArm');
assert.equal(mixamoBoneName('J_Bip_R_LowerArm'),'rightLowerArm');
assert.equal(mixamoBoneName('J_Bip_L_Thumb2'),'leftThumbProximal');
assert.equal(mixamoBoneName('J_Bip_R_Little3'),'rightLittleDistal');
assert.equal(mixamoBoneName('J_Bip_C_Head'),'head');
assert.equal(mixamoBoneName('J_Sec_L_SkirtSide0'),null);
assert.equal(mixamoBoneName('mixamorig:LeftArm'),'leftUpperArm');
console.log(JSON.stringify({PASS:true,bodyBonesChecked:bodyNames.length,fingerBonesChecked:fingers.length,totalMapped:bodyNames.length+fingers.length},null,2));
