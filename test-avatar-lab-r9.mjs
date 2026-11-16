import assert from 'node:assert/strict';
import {avatarFileKind,validateAvatarFile,animationInventory,avatarRigReport,AvatarLoadGate} from './avatar-lab-core.js';
import {parseLocalAvatar,normalizeGenericAvatar,defaultAvatarFacingYaw,createEmbeddedPlayer} from './avatar-lab-viewer.js';
let checks=0;
const eq=(got,want,msg)=>{checks++;assert.deepEqual(got,want,msg);};
const yes=(v,msg)=>{checks++;assert(v,msg);};
const nope=(fn,part)=>{checks++;assert.throws(fn,new RegExp(part,'i'));};

eq(avatarFileKind({name:'Mint Adult.VRM'}),'vrm','VRM case insensitive');
eq(avatarFileKind({name:'Lumia 50K.glb'}),'glb');
eq(avatarFileKind({name:'Animated Body.FbX'}),'fbx');
eq(avatarFileKind({name:'animated.gltf'}),null,'no unsupported sidecar GLTF');
eq(avatarFileKind({name:'avatar.fbx.exe'}),null,'no executable masquerade');
nope(()=>validateAvatarFile({name:'avatar.fbx',size:0}),'vacío');
nope(()=>validateAvatarFile({name:'avatar.glb',size:400*1024*1024}),'300 MB');
eq(validateAvatarFile({name:'avatar.glb',size:1024}).kind,'glb');
const clips=[
 {name:'bad',duration:0,tracks:[1]},
 {name:'Idle',duration:1.2,tracks:[1,2]},
 {name:'Walk',duration:2.5,tracks:[1]},
];
eq(animationInventory(clips).map(x=>x.index),[1,2],'actual clip indices preserved');
const gate=new AvatarLoadGate();
const one=gate.next(),two=gate.next();
eq(gate.isCurrent(one),false,'reject async stale avatar');
eq(gate.isCurrent(two),true,'accept latest avatar');

const fakeModel={
  animations:clips.slice(1),
  children:[],
  updateMatrixWorld(){},
  traverse(fn){fn({isMesh:true,isSkinnedMesh:true,isBone:false,morphTargetDictionary:{Blink:0,Smile:1}});
    fn({isBone:true});}
};
const baseReport=avatarRigReport(fakeModel);
eq(baseReport.skinned,1);
eq(baseReport.bones,1);
eq(baseReport.morphTargets,2);
eq(baseReport.vrmHumanoid,false,'no VRM -> no forced retarget');

class FakeManager {setURLModifier(fn){this.modify=fn;}}
class FakeGLTF {constructor(mgr){this.manager=mgr;}register(){return this;}
  async parseAsync(){return {scene:fakeModel,userData:{},animations:clips.slice(1)};}}
class FakeFBX {constructor(mgr){this.manager=mgr;}parse(){return fakeModel;}}
class FakeGroup {
  constructor(){this.children=[];this.scale={setScalar(v){this.value=v;}};this.position={set(x,y,z){this.value=[x,y,z];}};this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};}
  add(obj){this.children.push(obj);}
}
class FakeVector{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
}
class FakeBox{
  setFromObject(){return this;}
  isEmpty(){return false;}
  getSize(o){o.x=2;o.y=4;o.z=1;return o;}
  getCenter(o){o.x=2;o.y=2;o.z=-3;return o;}
  get min(){return {y:0};}
}
class FakeMixer {
  constructor(){this.actions=[];this.events={};}
  addEventListener(n,cb){this.events[n]=cb;}
  removeEventListener(n){delete this.events[n];}
  stopAllAction(){this.stopped=true;}
  uncacheRoot(){this.uncached=true;}
  clipAction(clip){const action={
    reset(){return this;},setLoop(){return this;},setEffectiveTimeScale(){return this;},
    play(){return this;},stop(){},};this.actions.push(action);return action;}
  update(){this.updated=true;}
}
const THREE={LoadingManager:FakeManager,Group:FakeGroup,Box3:FakeBox,Vector3:FakeVector,
  AnimationMixer:FakeMixer,LoopRepeat:1,LoopOnce:2};
const opts={THREE,GLTFLoader:FakeGLTF,FBXLoader:FakeFBX,VRMLoaderPlugin:class{}};
const fakeFile=(name)=>({name,size:4096,async arrayBuffer(){return new ArrayBuffer(8);}});
// External references must be satisfied exclusively by user-selected images.
class SidecarGLTF extends FakeGLTF {
  async parseAsync(){
    const objectUrl=this.manager.modify('textures/skin.png');
    yes(objectUrl.startsWith('blob:'),'sidecar image was mapped to a local object URL');
    return {scene:fakeModel,userData:{},animations:clips.slice(1)};
  }
}
const sidecar=new Blob(['fake-image-bytes']);
Object.defineProperty(sidecar,'name',{value:'Skin.PNG'});
const localModel=await parseLocalAvatar(fakeFile('character.glb'),{
  ...opts,GLTFLoader:SidecarGLTF,resources:[sidecar],
});
localModel.releaseSidecars();
class ExternalGLTF extends FakeGLTF {
  async parseAsync(){this.manager.modify('https://example.invalid/remote.jpg');}
}
checks++;await assert.rejects(
  parseLocalAvatar(fakeFile('untrusted.glb'),{...opts,GLTFLoader:ExternalGLTF}),
  /Falta textura externa/,'no remote asset fetch from user model'
);

const glb=await parseLocalAvatar(fakeFile('character.glb'),opts);
eq(glb.kind,'glb');
eq(glb.inventory.length,2);
eq(glb.report.vrmHumanoid,false);
const fbx=await parseLocalAvatar(fakeFile('character.fbx'),opts);
eq(fbx.kind,'fbx');
const fitted=normalizeGenericAvatar(THREE,fakeModel,{kind:'glb'});
yes(Math.abs(fitted.scale-.4375)<1e-5,'uniform fit from height');
eq(fitted.bounds.y,1.75);
eq(defaultAvatarFacingYaw('glb'),Math.PI,'generic GLB points toward -Z camera');
eq(defaultAvatarFacingYaw('fbx'),Math.PI,'generic FBX points toward -Z camera');
eq(defaultAvatarFacingYaw('vrm'),0,'approved VRM default front is preserved');
eq(fitted.defaultYaw,Math.PI,'wrapper stores front-facing default for reset');
eq(fitted.wrapper.rotation.y,Math.PI,'GLB is turned around at scene wrapper, not on bones');
eq(fitted.pivot.position.value,[-2,0,3],'off-center avatar rotates around its body instead of orbiting away');
yes(fitted.wrapper.position.value.every(n=>Math.abs(n)<1e-10),'outer facing pivot remains centered on scene origin');
eq(fitted.wrapper.children[0].children[0],fakeModel,'original skeleton and embedded animations untouched');
const fbxFitted=normalizeGenericAvatar(THREE,fakeModel,{kind:'fbx'});
eq(fbxFitted.wrapper.rotation.y,Math.PI,'FBX also starts facing viewer');
const player=createEmbeddedPlayer(THREE,fakeModel,clips.slice(1));
yes(player.play(0,{loop:true,speed:1}),'embedded clip plays');
player.step(.016);
yes(player.snapshot().playing,'mixer running');
yes(player.togglePause(),'pause embedded clip');
player.stop();
eq(player.snapshot().playing,false,'restore playback state');
player.dispose();
console.log('Motion R9-02 avatar switcher: '+checks+' checks PASS; orientation, VRM/GLB/FBX policy, rig, async races, playback and fit.');
