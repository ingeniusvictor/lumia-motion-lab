/**
 * Motion R9-02 browser-only avatar parsing and embedded animation playback.
 * No server upload or execution. Standalone binary VRM/GLB/FBX is supported.
 * External textures/sidecars are explicitly rejected for this first version.
 */
import {avatarRigReport,animationInventory,validateAvatarFile} from './avatar-lab-core.js';

function privateAssetManager(THREE) {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    // The three.js parsers create blob: URLs for images embedded in the file.
    if (/^(?:data:|blob:)/i.test(url)) return url;
    throw new Error('Este modelo necesita texturas o archivos externos. Exporta VRM/GLB autocontenido o FBX con texturas incrustadas.');
  });
  return manager;
}

export async function parseLocalAvatar(file, {THREE,GLTFLoader,FBXLoader,VRMLoaderPlugin}) {
  const info=validateAvatarFile(file);
  const buffer=await file.arrayBuffer();
  let model,vrm=null,clips=[];
  if(info.kind==='fbx') {
    const loader=new FBXLoader(privateAssetManager(THREE));
    model=loader.parse(buffer,'');
    clips=model.animations||[];
  }else{
    const loader=new GLTFLoader(privateAssetManager(THREE));
    loader.register((parser)=>new VRMLoaderPlugin(parser));
    const gltf=await loader.parseAsync(buffer,'');
    vrm=gltf.userData?.vrm||null;
    model=vrm?.scene||gltf.scene;
    clips=gltf.animations||[];
  }
  if(!model)throw new Error('El archivo no contiene una escena 3D.');
  const report=avatarRigReport(model,vrm);
  if(info.kind==='fbx' && report.meshes===0)
    throw new Error('El FBX solo contiene animaciones/huesos y no tiene malla. Exporta FBX With Skin para usarlo como personaje.');
  if(report.meshes===0)
    throw new Error('El archivo no tiene ninguna malla visible.');
  return {info,model,vrm,clips,inventory:animationInventory(clips),report,
    kind:vrm?'vrm':info.kind};
}

export function normalizeGenericAvatar(THREE,model) {
  model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model);
  if(box.isEmpty())throw new Error('No se encontraron límites visuales para encuadrar el personaje.');
  const size=box.getSize(new THREE.Vector3());
  if(![size.x,size.y,size.z].every(Number.isFinite)||Math.max(size.x,size.y,size.z)<1e-5)
    throw new Error('El modelo tiene dimensiones inválidas.');
  const center=box.getCenter(new THREE.Vector3());
  // Whole character fits a ~1.75m tall reference frame; never stretch axes.
  const scale=Math.min(1.75/Math.max(size.y,1e-5),
    2/Math.max(size.x,1e-5),2/Math.max(size.z,1e-5));
  if(!Number.isFinite(scale)||scale<1e-7||scale>1e7)
    throw new Error('La escala del modelo no es utilizable.');
  const wrapper=new THREE.Group();
  wrapper.name='MotionR9LocalAvatarWrapper';
  wrapper.add(model);
  wrapper.scale.setScalar(scale);
  wrapper.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
  return {wrapper,scale,bounds:{x:size.x*scale,y:size.y*scale,z:size.z*scale}};
}

export function createEmbeddedPlayer(THREE,root,clips) {
  const mixer=new THREE.AnimationMixer(root);
  let action=null,playing=false,paused=false,index=-1;
  const onFinish=()=>{if(action){action.stop();action=null;}playing=false;paused=false;};
  mixer.addEventListener('finished',onFinish);
  return {
    clips,
    play(next,{loop=true,speed=1}={}){
      if(!Number.isSafeInteger(next)||next<0||next>=clips.length||
        !Array.isArray(clips[next]?.tracks)||!clips[next].tracks.length)return false;
      mixer.stopAllAction();
      action=mixer.clipAction(clips[next]);
      action.reset();action.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
      action.clampWhenFinished=!loop;
      action.setEffectiveTimeScale(Number.isFinite(speed)?Math.max(.1,Math.min(2,speed)):1);
      action.play();playing=true;paused=false;index=next;return true;
    },
    stop(){mixer.stopAllAction();playing=false;paused=false;action=null;},
    togglePause(){if(!action||!playing)return false;paused=!paused;action.paused=paused;return paused;},
    step(dt){if(playing&&!paused)mixer.update(dt);},
    rotateSpeed(speed){if(action)action.setEffectiveTimeScale(Math.max(.1,Math.min(2,speed)));},
    dispose(){mixer.removeEventListener('finished',onFinish);mixer.stopAllAction();mixer.uncacheRoot(root);},
    snapshot(){return {playing,paused,index,clip:index>=0?clips[index]?.name:null,count:clips.length};}
  };
}
export function disposeImportedAvatar(model) {
  if(!model)return;
  const disposed=new Set();
  model.traverse?.((part)=>{
    if(part.geometry&&!disposed.has(part.geometry)){
      disposed.add(part.geometry);part.geometry.dispose?.();
    }
    const materials=Array.isArray(part.material)?part.material:[part.material].filter(Boolean);
    for(const mat of materials){
      if(disposed.has(mat))continue;
      disposed.add(mat);
      for(const val of Object.values(mat)){
        if(val?.isTexture && !disposed.has(val)){disposed.add(val);val.dispose?.();}
      }
      mat.dispose?.();
    }
  });
}
