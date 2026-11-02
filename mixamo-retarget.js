/** LUMIA v0.8.4 R3: imports user-provided Mixamo FBX clips onto the VRM normalized humanoid.
 * Upper-body rotations are retargeted. Optional leg rotations for in-place walking. No translations or hip tracks,
 * protecting the approved idle pose, camera position and feet.
 * Adaptation strategy follows the public three-vrm Mixamo example.
 */
const map={Hips:'hips',Spine:'spine',Spine1:'chest',Spine2:'upperChest',
  LeftShoulder:'leftShoulder',LeftArm:'leftUpperArm',LeftForeArm:'leftLowerArm',LeftHand:'leftHand',
  RightShoulder:'rightShoulder',RightArm:'rightUpperArm',RightForeArm:'rightLowerArm',RightHand:'rightHand'};
for(const side of ['Left','Right']){
 for(const [prefix,name] of [['Thumb','Thumb'],['Index','Index'],['Middle','Middle'],['Ring','Ring'],['Pinky','Little']]){
  for(let i=1;i<=3;i++){
   const suffix=prefix==='Thumb' ? ['Metacarpal','Proximal','Distal'][i-1] : ['Proximal','Intermediate','Distal'][i-1];
   map[`${side}Hand${prefix}${i}`] = `${side.toLowerCase()}${name}${suffix}`;
  }
 }
}

// GLB Rigged Lite 155 exported from original Lumia retains original J_Bip_* names.
// These ARE NOT mixamorig:* names; use explicit correspondences.
const lumiaRigMap={
 J_Bip_C_Hips:'hips',J_Bip_C_Spine:'spine',J_Bip_C_Chest:'chest',
 J_Bip_C_UpperChest:'upperChest',J_Bip_C_Neck:'neck',J_Bip_C_Head:'head',
};
for(const side of ['L','R']){
 const prefix=side==='L'?'left':'right';
 for(const [j,n] of Object.entries({Shoulder:'Shoulder',UpperArm:'UpperArm',LowerArm:'LowerArm',Hand:'Hand',UpperLeg:'UpperLeg',LowerLeg:'LowerLeg',Foot:'Foot',ToeBase:'Toes'})){
  lumiaRigMap[`J_Bip_${side}_${j}`]=prefix+n;
 }
 for(const finger of ['Thumb','Index','Middle','Ring','Little']){
  const fName=finger==='Little'?'Little':finger;
  for(let k=1;k<=3;k++){
   const level=finger==='Thumb'?['Metacarpal','Proximal','Distal'][k-1]:['Proximal','Intermediate','Distal'][k-1];
   lumiaRigMap[`J_Bip_${side}_${finger}${k}`]=`${prefix}${fName}${level}`;
  }
 }
}

export function mixamoBoneName(name){
 const raw=String(name||'').split('.')[0].split(':').pop();
 const short=raw.replace(/^mixamorig(?:_)?/i,'');
 return lumiaRigMap[short]??map[short]??null;
}
export function retargetMixamoUpperBody(asset,vrm,THREE,{fullBody=false,includeHips=false,includeHead=false}={}){
 if(!asset?.animations?.length)throw Error('El FBX no contiene animaciones. Descarga el FBX animado desde Mixamo.');
 const sourceClip=asset.animations.find(a=>a.tracks?.length)??asset.animations[0];
 const permitted=new Set([
   'spine','chest','upperChest',
   'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
   'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
   ...Object.values(map).filter(b=>/^(left|right)(Thumb|Index|Middle|Ring|Little)/.test(b))
 ]);
 if(includeHead){permitted.add('neck');permitted.add('head');}
 if(includeHips)permitted.add('hips');
 if(fullBody){for(const leg of ['leftUpperLeg','leftLowerLeg','leftFoot','leftToes','rightUpperLeg','rightLowerLeg','rightFoot','rightToes'])permitted.add(leg);}
 const tracks=[], matched=new Set(), ignored=[];
 const restInv=new THREE.Quaternion(),parentWorld=new THREE.Quaternion(),q=new THREE.Quaternion();
 const vrm0=vrm.meta?.metaVersion==='0';
 asset.updateWorldMatrix(true,true);
 for(const track of sourceClip.tracks){
  const dot=track.name.lastIndexOf('.');
  if(dot<0)continue;
  const sourceName=track.name.slice(0,dot);
  const prop=track.name.slice(dot+1);
  const vrmName=mixamoBoneName(sourceName);
  if(!vrmName||!permitted.has(vrmName)||prop!=='quaternion')continue;
  const target=vrm.humanoid?.getNormalizedBoneNode?.(vrmName);
  const source=asset.getObjectByName(sourceName) || asset.getObjectByName(sourceName.replace(/:/g,'')) ||
    (()=>{let found=null; asset.traverse(o=>{if(!found&&o.isBone&&mixamoBoneName(o.name)===vrmName)found=o;});return found;})();
  if(!target||!source||!source.parent){ignored.push(sourceName);continue;}
  source.getWorldQuaternion(restInv).invert();
  source.parent.getWorldQuaternion(parentWorld);
  const vals=new Float32Array(track.values.length);
  for(let i=0;i<track.values.length;i+=4){
   q.fromArray(track.values,i).premultiply(parentWorld).multiply(restInv).normalize();
   // Handedness correction for legacy VRM0. Equivalent to quaternion [-x,y,-z,w].
   vals[i]=vrm0?-q.x:q.x;vals[i+1]=q.y;vals[i+2]=vrm0?-q.z:q.z;vals[i+3]=q.w;
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${target.name}.quaternion`,track.times,vals));
  matched.add(vrmName);
 }
 if(matched.size<4||!matched.has('leftUpperArm')&&!matched.has('rightUpperArm'))
  throw Error(`Animación incompatible: solo ${matched.size} huesos corporales reconocidos. Comprueba nombres y jerarquía del rig.`);
 // Root translation and head rotations are excluded: do not compete with eyes, head and lips.
 const clip=new THREE.AnimationClip(`Lumia_Mixamo_${sourceClip.name||'motion'}`,sourceClip.duration,tracks);
 return {clip,matched:[...matched],ignored,tracks:tracks.length,sourceTrackCount:sourceClip.tracks.length,duration:clip.duration,fullBody,includeHips,includeHead};
}
