import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {VRMLoaderPlugin} from '@pixiv/three-vrm';
import {NaturalMotionCore} from './motion-core.js';
import {BodyMotionCore} from './body-motion-core.js';
import {BodyPresenceCore, PRESENCE_DEFAULTS} from './body-presence.js';
import {retargetMixamoUpperBody} from './mixamo-retarget.js';
import {motionCatalog,animationLibrary} from './motion-library-catalog.js';
import {clampClipSpeed, clipDurationAtSpeed, secondsRemaining, speedLabel, DEFAULT_CLIP_SPEED} from './animation-speed.js';
import {controller as conversation, getVisemeCue, getEmotionCue} from './conversation-runtime.js';
import {createForwardWalkController} from './walking-forward.js';
import {createCircleWalkController} from './walking-circle.js';
import {MotionIntelligence} from './motion-intelligence.js';
import {SemanticMotionCore} from './semantic-motion.js';
import {PoseTransition} from './pose-transition.js';
import {repairQuaternionMicroSpikes} from './motion-clip-stability.js';
import {buildDanceRoutine, DanceSequenceClock, prepareDancePlan} from './dance-choreography.js';

const $ = (selector) => document.querySelector(selector);
const mount = $('#view');
const status = $('#status-text');
const details = $('#details');
const runtimeState = $('#runtime-state');
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x101e30, 0);
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xb8f5ff, 0x25344c, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(-2,3,-3); scene.add(key);
const rim = new THREE.DirectionalLight(0x25d8fb,1.7);
rim.position.set(2,3,1); scene.add(rim);
const camera = new THREE.PerspectiveCamera(31,1,0.04,70);
const controls = new OrbitControls(camera, renderer.domElement);
let stageOffsetZ=0,stageOffsetX=0; // Movement offsets in the viewer (VRM remains untouched).
let cameraFollowOffsetZ=0,cameraFollowOffsetX=0;
controls.enableDamping = true;
controls.minDistance = 0.4;
controls.maxDistance = 5;
function cameraView(x,y,z,tx=0,ty=1.25,tz=0) {
  camera.position.set(x+stageOffsetX,y,z+stageOffsetZ);
  controls.target.set(tx+stageOffsetX,ty,tz+stageOffsetZ);
  controls.update();
}
const cameraPresets = {
  head: [0,1.54,-0.60,0,1.54,0],
  bust: [0,1.37,-1.0,0,1.36,0],
  full: [0,1.03,-2.85,0,0.96,0],
  quarter: [.70,1.43,-.86,0,1.39,0],
};
function setCameraPreset(name) {
  const view = cameraPresets[name];
  if (view) cameraView(...view);
  document.querySelectorAll('[data-camera]').forEach(el => el.classList.toggle('active', el.dataset.camera===name));
}
setCameraPreset('bust');
document.querySelectorAll('[data-camera]').forEach(el=>el.addEventListener('click',()=>setCameraPreset(el.dataset.camera)));

const core = new NaturalMotionCore();
const bodyCore = new BodyMotionCore();
const presenceCore = new BodyPresenceCore();
const presenceConfig={...PRESENCE_DEFAULTS};
const mixamoState={mixer:null,action:null,active:false,ready:false,tracks:0,clip:null,looping:false,source:null,
  speed:DEFAULT_CLIP_SPEED, repetitions:1, elapsedSource:0,fadeOutRemaining:0,fadeOutDuration:0.62,fadeInRemaining:0,fadeInDuration:0.55,origin:null};
const motionIntelligence=new MotionIntelligence({enabled:true,variety:55});
const semanticMotion=new SemanticMotionCore({enabled:true,intensity:48});
const poseBridge=new PoseTransition(.44);
let poseBlendEnabled=true;
let conversationEventStatus='Sin eventos de voz';
let semanticLastStatus='';
window.addEventListener('lumia:speech-motion',event=>{
 const {phase,text,index,id,source}=event.detail||{};
 conversationEventStatus=phase==='start'?`Voz iniciada · ${source} · sesión ${id}`:phase==='boundary'?`Avance de palabra · sesión ${id}`:`Voz finalizada · sesión ${id}`;
 const voiceInfo=$('#r8-voice-status');if(voiceInfo)voiceInfo.textContent=conversationEventStatus;
 if(phase==='start')semanticMotion.begin(text);
 else if(phase==='boundary')semanticMotion.boundary(index);
 else if(phase==='end')semanticMotion.end();
 updateSemanticUI();
});
let manualLock=false,autoMotionPending=false,autoRequestId=0;
let selectedFbx=null;
let currentLoadToken=0;
const motionCache=new Map();
const stabilityConfig={repairThinking:false};
let lastThinkingRepair=null;
let forwardWalkController=null;
let forwardWalkKeys=null;
let circleWalkController=null,circleWalkKeys=null,circleWalkAuto=false;
let thinkingSince=0,thinkingAutoTriggered=false,thinkingAutoPending=false;
let followWalkingCamera=true;
async function loadForwardTrajectory(){
  if(forwardWalkKeys)return forwardWalkKeys;
  const response=await fetch('./walking-forward-motion.json');
  if(!response.ok)throw Error('No se encontró la trayectoria de Walking adelante.');
  const data=await response.json();
  if(!Array.isArray(data.keys)||data.keys.length<2)throw Error('Trayectoria FBX incompleta.');
  forwardWalkKeys=data.keys;
  return forwardWalkKeys;
}
async function loadCircleTrajectory(){
 if(circleWalkKeys)return circleWalkKeys;
 const response=await fetch('./walking-circle-motion.json');
 if(!response.ok)throw Error('Falta la trayectoria de Walk In Circle.');
 const data=await response.json();
 if(!Array.isArray(data.keys)||data.keys.length<100)throw Error('Trayectoria circular incompleta.');
 circleWalkKeys=data.keys;return circleWalkKeys;
}
function resetWalkingPosition(){
 stopMixamo({immediate:true});
 if(forwardWalkController){forwardWalkController.halt();forwardWalkController=null;}
 if(circleWalkController){circleWalkController.halt();circleWalkController=null;}
 if(vrm){vrm.scene.position.x-=stageOffsetX;vrm.scene.position.z-=stageOffsetZ;vrm.scene.rotation.y=0;}
 camera.position.x-=cameraFollowOffsetX;camera.position.z-=cameraFollowOffsetZ;
 controls.target.x-=cameraFollowOffsetX;controls.target.z-=cameraFollowOffsetZ;
 stageOffsetZ=0;stageOffsetX=0;cameraFollowOffsetZ=0;cameraFollowOffsetX=0;
 controls.update();
 animFeedback('Lumia volvió al punto de partida y recuperó su orientación.');
}
function updateCircleWalk(elapsedSource){
 if(!circleWalkController?.active||!vrm)return;
 const next=circleWalkController.advance(elapsedSource);if(!next)return;
 const dx=next.x-stageOffsetX,dz=next.z-stageOffsetZ;
 vrm.scene.position.x+=dx;vrm.scene.position.z+=dz;
 stageOffsetX=next.x;stageOffsetZ=next.z;
 vrm.scene.rotation.y=next.yaw;
 if(followWalkingCamera){
  camera.position.x+=dx;camera.position.z+=dz;
  controls.target.x+=dx;controls.target.z+=dz;
  cameraFollowOffsetX+=dx;cameraFollowOffsetZ+=dz;
 }
}

function updateForwardWalk(elapsedSource){
  if(!forwardWalkController?.active||!vrm)return;
  const delta=forwardWalkController.advance(elapsedSource);
  if(Math.abs(delta)>1e-9){
    vrm.scene.position.z-=delta;
    stageOffsetZ-=delta;
    if(followWalkingCamera){camera.position.z-=delta;controls.target.z-=delta;cameraFollowOffsetZ-=delta;}
  }
}

let selectedMotionId=null;
const danceState={token:0,loading:false,active:false,paused:false,stopping:false,routine:null,plan:null,clock:null,mixer:null,actions:[],currentIndex:-1,stopRemaining:0};
const danceUploads=new Map();let danceImportCounter=0;
const danceSelections=['#dance-step-1','#dance-step-2','#dance-step-3'];
const categoryIcons={conversacion:'💬',emociones:'✨',movimiento:'🚶',baile:'🕺'};
for(const item of motionCatalog){
 const mount=document.querySelector(`[data-motion-group="${item.category}"]`);
 if(!mount)continue;
 const button=document.createElement('button');
 button.type='button';button.textContent=item.label;
 button.dataset.libraryClip=item.id;
 button.title=item.id==='walking'?'Marcha en sitio.':item.id==='walkingforward'?'Avanza realmente por la escena.':item.id==='walkingcircle'?'Recorrido circular real de un ciclo, con giro de cuerpo y seguimiento opcional de cámara.':`Reproducir ${item.label}`;
 mount.appendChild(button);
}
function setSelectedMotion(key){
 selectedMotionId=key;
 document.querySelectorAll('[data-library-clip]').forEach(b=>b.classList.toggle('active',b.dataset.libraryClip===key));
 const cfg=animationLibrary[key];
 if($('#motion-clip-detail')&&cfg){
  $('#motion-clip-detail').textContent=`${cfg.label} · ${cfg.loop?'bucle':'gesto de '+cfg.repetitions+' repetición(es)'}${cfg.id==='walking'?' · marcha en sitio':cfg.id==='walkingforward'?' · avance real':cfg.id==='walkingcircle'?' · círculo real + giro corporal':''}`;
 }
}
function updateClipSpeed(nextValue){
 const speed=clampClipSpeed(nextValue);
 mixamoState.speed=speed;
 const slider=$('#mixamo-speed');
 if(slider)slider.value=String(speed);
 document.querySelectorAll('[data-mixamo-speed]').forEach(b=>b.classList.toggle('active',
  Math.abs(Number(b.dataset.mixamoSpeed)-speed)<.001));
 const label=$('#mixamo-speed-label');
 if(label)label.textContent=speedLabel(speed);
 if(mixamoState.action)mixamoState.action.setEffectiveTimeScale(speed);
 // R6: velocidad efectiva de la secuencia y del reloj sincronizadas en tiempo real.
 for(const action of danceState.actions)action.setEffectiveTimeScale(speed);
 const cfg=mixamoState.source && animationLibrary[mixamoState.source];
 const repetitions=cfg?.repetitions??mixamoState.repetitions;
 const secs=mixamoState.clip?.duration;
 const duration=$('#mixamo-speed-duration');
 if(duration)duration.textContent=Number.isFinite(secs)
  ? (repetitions===Infinity
    ? `Ciclo ${clipDurationAtSpeed(secs,speed,1).toFixed(2)} s · bucle`
    : `Duración estimada ${clipDurationAtSpeed(secs,speed,repetitions).toFixed(2)} s`)
  : 'Carga un clip para ver su duración ajustada.';
 return speed;
}
const animFeedback=(msg,error=false)=>{
 const el=$('#mixamo-status');if(el){el.textContent=msg;el.style.color=error?'#ffbcae':'#b6f0ff';}
};
function stopMixamo({immediate=false}={}){
 if(forwardWalkController){forwardWalkController.halt();forwardWalkController=null;}
 if(circleWalkController){circleWalkController.halt();circleWalkController=null;}
 if(!immediate && mixamoState.action && mixamoState.active){
  // Fade FBX to procedural pose on user interruption or when voice ends.
  mixamoState.fadeOutRemaining=mixamoState.fadeOutDuration;
  mixamoState.active=false;
  return;
 }
 if(mixamoState.action)mixamoState.action.stop();
 mixamoState.active=false;
 mixamoState.looping=false;
 mixamoState.fadeOutRemaining=0;
 mixamoState.fadeInRemaining=0;
}
function prepareClip(asset,label,opts={}){
 if(!vrm)throw Error('Lumia todavía no está cargada');
 const result=asset?.clip && Array.isArray(asset.matched)?asset:retargetMixamoUpperBody(asset,vrm,THREE,opts);
 if(poseBlendEnabled && (mixamoState.active||mixamoState.fadeOutRemaining>0)){
  // One snapshot only when transitioning from an active FBX to a new FBX.
  poseBridge.capture(bodyTargets.concat(['leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']).map(name=>vrm.humanoid?.getNormalizedBoneNode?.(name)),.44);
 }else poseBridge.clear();
 stopMixamo({immediate:true});
 if(mixamoState.mixer){mixamoState.mixer.stopAllAction();mixamoState.mixer.uncacheRoot(vrm.scene);}
 mixamoState.mixer=new THREE.AnimationMixer(vrm.scene);
 mixamoState.clip=result.clip;
 mixamoState.action=mixamoState.mixer.clipAction(result.clip);
 mixamoState.ready=true;
 mixamoState.tracks=result.tracks;
 mixamoState.source=label;
 mixamoState.elapsedSource=0;
 updateClipSpeed(mixamoState.speed);
 mixamoState.mixer.addEventListener('finished',()=>{
  if(!mixamoState.active||mixamoState.looping)return;
  // The FBX action can finish between render frames. Apply its exact final closed-loop pose first.
  if(circleWalkController?.active)updateCircleWalk(circleWalkKeys[circleWalkKeys.length-1][0]);
  const wasManual=mixamoState.origin==='manual';
  stopMixamo();
  if(wasManual){manualLock=false;motionIntelligence.postpone(elapsed,1.1);}
  animFeedback(`Gesto ${label} completado. Volviendo a reposo.`);
 });
 $('#mixamo-play').disabled=false;
 selectedFbx=label;
 animFeedback(`${label}: ${result.tracks} pistas · ${result.matched.length} huesos reconocidos · ${result.duration.toFixed(2)} s. Preparado.`);
 return result;
}
async function importMixamoFile(file){
 if(!vrm)throw Error('Lumia todavía no está cargada');
 if(!file||!/\.fbx$/i.test(file.name))throw Error('Selecciona un archivo FBX.');
 if(file.size>45*1024*1024)throw Error('Archivo demasiado grande (máximo 45 MB).');
 const token=++currentLoadToken;
 const url=URL.createObjectURL(file);
 try{
  animFeedback('Leyendo FBX With Skin…');
  const asset=await new FBXLoader().loadAsync(url);
  if(token!==currentLoadToken)return;
  prepareClip(asset,file.name);
 }finally{URL.revokeObjectURL(url);}
}
async function loadLibraryClip(key,guard=()=>true){
 if(!vrm)throw Error('El avatar todavía está cargando.');
 const cfg=animationLibrary[key];if(!cfg)throw Error('Gesto desconocido');
 if(!guard())return null;
 const token=++currentLoadToken;
 animFeedback(`Preparando ${cfg.label} · ${motionCache.has(key)?'usando caché':'leyendo FBX de 155 huesos'}…`);
 let result=motionCache.get(key);
 if(!result){
   const asset=await new FBXLoader().loadAsync(cfg.path);
   if(token!==currentLoadToken||!guard())return null;
   result=retargetMixamoUpperBody(asset,vrm,THREE,{fullBody:cfg.fullBody,includeHips:cfg.includeHips,includeHead:cfg.includeHead});
   motionCache.set(key,result); // caché de pistas de animación, sin conservar geometría FBX adicional.
 }
 if(token!==currentLoadToken||!guard())return null;
 if(key==='thinking'&&stabilityConfig.repairThinking){
   let fixed=motionCache.get('thinking:fixed');
   if(!fixed){
     fixed={...result,clip:result.clip.clone()};
     fixed.stability=repairQuaternionMicroSpikes(fixed.clip);
     motionCache.set('thinking:fixed',fixed);
     console.info('[LUMIA R5] Reparación opcional Thinking:',fixed.stability);
   }
   result=fixed;lastThinkingRepair=fixed.stability;updateStabilityUI();
 }
 prepareClip(result,cfg.label);
 mixamoState.source=key;
 setSelectedMotion(key);
 updateClipSpeed(mixamoState.speed);
 return cfg;
}
function playMixamo({loop=false,repetitions=1}={}){
 if(!mixamoState.ready||!vrm||!mixamoState.action)return false;
 if(mixamoState.active||mixamoState.fadeOutRemaining>0)stopMixamo({immediate:true});
 bodyCore.clearGestures();
 const action=mixamoState.action;
 action.reset();
 mixamoState.fadeOutRemaining=0;
 mixamoState.fadeInRemaining=mixamoState.fadeInDuration;
 mixamoState.repetitions=repetitions;
 mixamoState.elapsedSource=0;
 action.setEffectiveTimeScale(mixamoState.speed);
 action.clampWhenFinished=!loop;
 action.setLoop(loop?THREE.LoopRepeat:repetitions>1?THREE.LoopRepeat:THREE.LoopOnce,repetitions);
 action.setEffectiveWeight(0.02);
 action.play();
 mixamoState.active=true;mixamoState.looping=loop;
 animFeedback(`Reproduciendo ${selectedFbx||'animación'} · ${speedLabel(mixamoState.speed)} · ${loop?'bucle':'gesto'} · rostro y voz activos`);
 return true;
}
async function playLibraryClip(key,{origin='manual',guard=()=>true}={}){
 try{
  if(!guard())return false;
  if(key==='walkingforward')await loadForwardTrajectory();
  if(key==='walkingcircle')await loadCircleTrajectory();
  if(!guard())return false;
  const cfg=await loadLibraryClip(key,guard);
  if(!cfg||!guard())return false;
  const started=playMixamo({loop:cfg.loop,repetitions:cfg.repetitions});
  if(started)mixamoState.origin=origin;
  if(started&&key==='walkingforward')forwardWalkController=createForwardWalkController(forwardWalkKeys);
  if(started&&key==='walkingcircle'){circleWalkController=createCircleWalkController(circleWalkKeys);circleWalkController.begin({x:stageOffsetX,z:stageOffsetZ,yaw:vrm.scene.rotation.y});}
  if(forwardWalkController)forwardWalkController.begin();
  return started;
 }catch(err){console.error(err);animFeedback(`Error en ${key}: ${String(err.message||err)}`,true);return false;}
}
const bodyBones = new Map();
const boneBaseRotation = new Map();
const bodyEuler = new THREE.Euler(0,0,0,'XYZ');
const bodyDelta = new THREE.Quaternion();
const bodyTargets = [
 'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm',
 'leftLowerArm','rightLowerArm','leftHand','rightHand','chest','spine','hips'
];
function applyBodyPose(b,presence=null){
 const extra=presence?.offsets||{};
 for(const boneName of bodyTargets){
  const node=bodyBones.get(boneName);
  if(!node)continue;
  const x=(b[`${boneName}X`]??0)+(extra[`${boneName}X`]??0);
  const y=(b[`${boneName}Y`]??0)+(extra[`${boneName}Y`]??0);
  const z=(b[`${boneName}Z`]??0)+(extra[`${boneName}Z`]??0);
  bodyEuler.set(x,y,z,'XYZ');
  bodyDelta.setFromEuler(bodyEuler);
  node.quaternion.copy(boneBaseRotation.get(boneName)).multiply(bodyDelta);
 }
}

const lookTarget = new THREE.Object3D();
scene.add(lookTarget);
let vrm = null;
let headBone = null;
let headOriginalQuaternion = new THREE.Quaternion();
const localDelta = new THREE.Quaternion();
const localEuler = new THREE.Euler(0,0,0,'YXZ');
const config = {
  behavior: 'idle', lookUp: false, live: true, blink: true, gaze: true, head: true, expression: true,
  gazeMode:'ambient', intensity: 0.65, gazePower:0.95, gazeResponse:12, headFollow:0.80, headPower:0.90, headResponse:7.5, emotionIntensity:0.70, manualX:0, manualY:0,
  cursorInside: false, cursorX:0, cursorY:0, talking:false,
  bodyMotion:true, bodyPose:'natural', bodyIntensity:.60, bodySpeed:5.0,
  bodyDepth:.75, bodyWrist:.75, bodyDepthSign:1,
};
const vocalNames = {aa:'A', ee:'E', ih:'I', oh:'O', ou:'U'};
const emotionCandidates={
 neutral:[],happy:['happy','Joy'],angry:['angry','Angry'],sad:['sad','Sorrow'],
 relaxed:['relaxed','Fun'],surprised:['surprised','Surprised'],extra:['Extra','extra'],
 curious:['surprised','Surprised','happy']
};
const activeEmotionWeights=new Map();
const mouthWeights=new Map();
let emotionNames={};
function buildExpressionMap(manager){
 const keys=Object.keys(manager?.expressionMap||{});
 const find=(candidates)=>candidates.find(candidate=>keys.includes(candidate))||null;
 emotionNames={};
 for(const [id,candidates] of Object.entries(emotionCandidates)){
  if(id==='neutral')continue;
  if(id==='curious'){
   const s=find(['surprised','Surprised']);const h=find(['happy','Joy']);
   if(s)emotionNames[id]=[[s,.43],...(h?[[h,.15]]:[])];
  }else {const key=find(candidates);if(key) emotionNames[id]=[[key,1]];}
 }
 const missing=[];
 for(const el of document.querySelectorAll('[data-emotion]')){
  if(el.dataset.emotion==='neutral')continue;
  const allowed=!!emotionNames[el.dataset.emotion];el.disabled=!allowed;
  if(!allowed){el.title='Esta expresión no aparece en este VRM';missing.push(el.dataset.emotion);}
 }
 return {keys,missing};
}
function applyEmotion(manager,dt,state){
 const auto=getEmotionCue();
 const autoValid=chosenEmotion==='neutral'&&config.live&&config.expression&&auto?.emotion!=='neutral'&&emotionNames[auto?.emotion];
 const requested=autoValid
  ?emotionNames[auto.emotion].map(([name,ratio])=>[name,ratio*Math.min(.78,auto.intensity)*config.emotionIntensity])
  :chosenEmotion==='neutral' && config.live && config.expression
   ?(emotionNames.happy?[[emotionNames.happy[0][0],state.smile]]:[])
   :(emotionNames[chosenEmotion]||[]).map(([name,ratio])=>[name,ratio*config.emotionIntensity]);
 const targets=new Map(requested);
 const keys=new Set([...activeEmotionWeights.keys(),...targets.keys()]);
 for(const name of keys){
  const old=activeEmotionWeights.get(name)||0;
  const next=old+( (targets.get(name)||0)-old )*(1-Math.exp(-7*dt));
  activeEmotionWeights.set(name, next);
  manager.setValue(name,Math.max(0,Math.min(1,next)));
 }
}

const behaviorLabels={
 idle:['En reposo','Observa el entorno, parpadea y mantiene movimientos pequeños y espontáneos.'],
 listening:['Escuchando','Atiende al usuario o cursor, dirige la mirada al frente y acompaña con asentimientos suaves.'],
 thinking:['Pensando','Desvía la mirada hacia arriba y hacia un lado, con una ligera inclinación de cabeza.'],
 speaking:['Hablando','Articula palabras estimadas o reproduce marcas TTS externas, con gestos de cabeza y mirada atenta.'],
};
let demoStates=false,demoClock=0,demoIndex=0,lookUpUntil=0;
function updateIntelligenceUI(message=''){
 const toggle=$('#intelligence-enabled');if(toggle)toggle.checked=motionIntelligence.enabled;
 const variety=$('#intelligence-variety');if(variety)variety.value=String(motionIntelligence.variety);
 const autoIdle=$('#intelligence-auto-idle');if(autoIdle)autoIdle.checked=motionIntelligence.autoIdleEnabled;
 const accents=$('#intelligence-talk-accents');if(accents)accents.checked=motionIntelligence.allowTalkInterruptions;
 const thinkDelay=$('#intelligence-thinking-delay');if(thinkDelay)thinkDelay.value=String(motionIntelligence.thinkingDelay);
 const thinkLabel=$('#intelligence-thinking-delay-label');if(thinkLabel)thinkLabel.textContent=`${motionIntelligence.thinkingDelay.toFixed(2).replace('.',',')} s`;
 const label=$('#intelligence-variety-label');if(label)label.textContent=`${Math.round(motionIntelligence.variety)}%`;
 const legacy=$('#library-auto-talk');if(legacy){legacy.disabled=motionIntelligence.enabled;legacy.title=motionIntelligence.enabled?'Controlado por Motion Intelligence; disponible al desactivar el director.':'';}
 const el=$('#intelligence-status');if(el)el.textContent=message||(motionIntelligence.enabled?'Director activo · esperando señales de conversación':'Director desactivado · controles manuales disponibles');
}
function updateSemanticUI(){
 const enabled=$('#semantic-enabled');if(enabled)enabled.checked=semanticMotion.enabled;
 const slider=$('#semantic-intensity');if(slider)slider.value=String(semanticMotion.intensity);
 const label=$('#semantic-intensity-label');if(label)label.textContent=`${Math.round(semanticMotion.intensity)}%`;
 const info=$('#semantic-status');const s=semanticMotion.snapshot();
 if(info){const value=!s.enabled?'Gestos de significado desactivados':s.started?`Respuesta en curso · ${s.planned} gesto(s) detectado(s) · ${s.active||s.lastCue||'esperando frase'}`:'Esperando voz · el texto de la respuesta activará los gestos';
  if(value!==semanticLastStatus){info.textContent=value;semanticLastStatus=value;}
 }
}
$('#r8-pose-blend').addEventListener('change',event=>{poseBlendEnabled=!!event.target.checked;if(!poseBlendEnabled)poseBridge.clear();});
$('#semantic-enabled').addEventListener('change',event=>{semanticMotion.setEnabled(event.target.checked);updateSemanticUI();});
$('#semantic-intensity').addEventListener('input',event=>{semanticMotion.setIntensity(event.target.value);updateSemanticUI();});
document.querySelectorAll('[data-semantic-demo]').forEach(btn=>btn.addEventListener('click',()=>{
 const examples={affirm:'Sí, claro, estoy de acuerdo. Podemos continuar con el siguiente paso.',deny:'No estoy de acuerdo con esa idea. No sería correcto hacerlo de esa manera.',explain:'Primero revisemos el sistema. Por ejemplo, podemos comparar las dos opciones.',celebrate:'¡Felicidades! Lo conseguimos, ha sido un trabajo excelente.'};
 const reply=examples[btn.dataset.semanticDemo];if(reply)window.LUMIAConversation?.deliverResponse({reply},{speak:true});
}));
updateSemanticUI();
const semanticQuaternion=new THREE.Quaternion();const semanticEuler=new THREE.Euler(0,0,0,'XYZ');
function applySemanticBody(pose){
 for(const [name,value] of Object.entries(pose.body||{})){
  if(!Number.isFinite(value)||Math.abs(value)<.00001)continue;
  const m=/^(leftUpperArm|rightUpperArm|leftLowerArm|rightLowerArm|chest)(X|Y|Z)$/.exec(name);
  if(!m)continue;
  const bone=bodyBones.get(m[1]);if(!bone)continue;
  semanticEuler.set(m[2]==='X'?value:0,m[2]==='Y'?value:0,m[2]==='Z'?value:0);
  semanticQuaternion.setFromEuler(semanticEuler);
  bone.quaternion.multiply(semanticQuaternion); // Aditivo sobre la pose FBX, no la reemplaza
 }
}
function interruptAutoForManual(){
 autoRequestId++;autoMotionPending=false;motionIntelligence.invalidate();
 ++currentLoadToken;manualLock=true;
 if(mixamoState.origin==='automatic'&&mixamoState.active)stopMixamo();
}
function releaseManualControl(){
 manualLock=false;autoRequestId++;autoMotionPending=false;
 ++currentLoadToken;motionIntelligence.invalidate();motionIntelligence.postpone(elapsed,1);
}
async function playManualLibraryClip(key){
 stopDance({immediate:true});
 interruptAutoForManual();
 const started=await playLibraryClip(key,{origin:'manual'});
 if(!started)releaseManualControl();
 return started;
}
function directorTick(){
 if(!vrm||!motionIntelligence.enabled||autoMotionPending||manualLock)return;
 const cue=getEmotionCue();
 const intent=motionIntelligence.decide({now:elapsed,state:config.behavior,activeId:mixamoState.source,active:mixamoState.active,
  transitioning:mixamoState.fadeOutRemaining>0,manual:manualLock,pending:autoMotionPending,
  emotion:chosenEmotion==='neutral'?cue:{emotion:chosenEmotion,intensity:.65}});
 if(!intent)return;
 const requestId=++autoRequestId;
 autoMotionPending=true;
 const guard=()=>requestId===autoRequestId&&motionIntelligence.enabled&&!manualLock&&motionIntelligence.revision===intent.revision&&config.behavior===motionIntelligence.state;
 playLibraryClip(intent.id,{origin:'automatic',guard}).then(started=>{
  if(requestId!==autoRequestId)return;
  autoMotionPending=false;
  if(started&&guard()){
    motionIntelligence.commit(intent,elapsed);
    updateIntelligenceUI(`${intent.reason} · ${animationLibrary[intent.id]?.label||intent.id} · ${speedLabel(mixamoState.speed)}`);
  } else if(!started&&guard()){
    motionIntelligence.postpone(elapsed,2.5);
    updateIntelligenceUI(`No se pudo cargar ${intent.id}; reintento posterior.`);
  }
 }).catch(err=>{
  if(requestId!==autoRequestId)return;
  autoMotionPending=false;
  motionIntelligence.postpone(elapsed,2);
  updateIntelligenceUI('No se pudo iniciar el gesto automático: '+String(err?.message||err));
 });
}
function setIntelligenceEnabled(enabled){
 const old=motionIntelligence.enabled;
 motionIntelligence.setEnabled(enabled);
 autoRequestId++;autoMotionPending=false;++currentLoadToken;
 if(old&&!motionIntelligence.enabled&&mixamoState.origin==='automatic'&&mixamoState.active)stopMixamo();
 updateIntelligenceUI();
 return motionIntelligence.enabled;
}
$('#intelligence-enabled').addEventListener('change',e=>setIntelligenceEnabled(e.target.checked));
function updatePresenceUI(){
 const enabled=$('#presence-enabled');if(enabled)enabled.checked=presenceConfig.enabled;
 for(const [id,value] of [['presence-idle',presenceConfig.idleLevel],['presence-listening',presenceConfig.listeningLevel]]){
  const slider=$('#'+id);if(slider)slider.value=String(value);
  const label=$('#'+id+'-label');if(label)label.textContent=`${value}%`;
 }
 const status=$('#presence-status');if(status)status.textContent=presenceConfig.enabled
  ?'Presencia activa: respiración y pequeños ajustes de postura en reposo; gestos de atención al escuchar.'
  :'Presencia adicional apagada (los movimientos naturales anteriores siguen disponibles).';
}
$('#presence-enabled').addEventListener('change',e=>{presenceConfig.enabled=e.target.checked;updatePresenceUI();});
$('#presence-idle').addEventListener('input',e=>{presenceConfig.idleLevel=Math.max(0,Math.min(100,Number(e.target.value)));updatePresenceUI();});
$('#presence-listening').addEventListener('input',e=>{presenceConfig.listeningLevel=Math.max(0,Math.min(100,Number(e.target.value)));updatePresenceUI();});
updatePresenceUI();
$('#intelligence-talk-accents').addEventListener('change',e=>{motionIntelligence.setAllowTalkInterruptions(e.target.checked);updateIntelligenceUI(e.target.checked?'Gestos extra experimentales durante Talking: activados':'Talking continuo sin interrupciones automáticas');});
$('#intelligence-variety').addEventListener('input',e=>{motionIntelligence.setVariety(e.target.value);updateIntelligenceUI();});
$('#intelligence-thinking-delay').addEventListener('input',e=>{motionIntelligence.setThinkingDelay(e.target.value);updateIntelligenceUI();});
$('#intelligence-auto-idle').addEventListener('change',e=>{
 motionIntelligence.setAutoIdleEnabled(e.target.checked);
 autoRequestId++;autoMotionPending=false;++currentLoadToken;
 if(!motionIntelligence.autoIdleEnabled&&mixamoState.source==='idle'&&mixamoState.origin==='automatic'&&mixamoState.active)stopMixamo();
 updateIntelligenceUI(motionIntelligence.autoIdleEnabled?'Nuevo Idle en Reposo. Escuchando usa Head Gesture.':'Reposo procedimental activado. Escuchando usa Head Gesture.');
});
updateIntelligenceUI();
function updateStabilityUI(){
 const checkbox=$('#stability-thinking');if(checkbox)checkbox.checked=stabilityConfig.repairThinking;
 const status=$('#stability-status');
 if(status)status.textContent=stabilityConfig.repairThinking
  ? `Corrección adicional Thinking activada · ${lastThinkingRepair ? `${lastThinkingRepair.spikeCount} saltos instantáneos identificados en ${lastThinkingRepair.affectedTracks.length} pistas` : 'se aplicará al cargar el clip'}. Original FBX sin cambios.`
  : 'Thinking nuevo: sin picos de microtirones detectados. Reparación adicional apagada (recomendada).';
}
$('#stability-thinking').addEventListener('change',e=>{stabilityConfig.repairThinking=e.target.checked;updateStabilityUI();});
updateStabilityUI();
const stateOrder=['idle','listening','thinking','speaking'];
conversation.subscribe(({state})=>{
  // Conversation lifecycle takes precedence over the manual state demo.
  if(state!=='idle'){
    demoStates=false;
    $('#cycle-states').classList.remove('active');
    $('#cycle-states').setAttribute('aria-pressed','false');
    config.talking=false;
    $('#talk').classList.remove('active');
  }
  setBehavior(state,false);
});
function setBehavior(behavior,manual=true){
 if(!behaviorLabels[behavior])return;
 const previousBehavior=config.behavior;
 if(previousBehavior!==behavior){
  if(previousBehavior==='speaking'&&behavior!=='speaking')semanticMotion.end();
  thinkingSince=elapsed;thinkingAutoTriggered=false;thinkingAutoPending=false;
  autoRequestId++;autoMotionPending=false;++currentLoadToken;
  motionIntelligence.observe(behavior,elapsed);
  if(previousBehavior==='thinking'&&mixamoState.source==='walkingcircle'&&mixamoState.active&&mixamoState.origin!=='manual')stopMixamo();
  if(motionIntelligence.enabled&&mixamoState.origin==='automatic'&&mixamoState.active&&!manualLock)stopMixamo();
 }
 if(config.behavior!==behavior && !motionIntelligence.enabled && $('#library-auto-talk')?.checked){
  if(behavior==='speaking' && !mixamoState.active)playLibraryClip('talking',{origin:'legacy'});
  else if(behavior!=='speaking' && mixamoState.active && mixamoState.source==='talking')stopMixamo();
 }
 config.behavior=behavior;
 if(previousBehavior!==behavior&&motionIntelligence.enabled){
  const status={idle:'Reposo con nuevo Idle · respiración y movimiento suave',listening:'Escuchando · Head Gesture FBX exclusivo',thinking:`Pensando · gesto tras ${motionIntelligence.thinkingDelay.toFixed(2)} s`,speaking:'Preparando gestos de conversación'};
  updateIntelligenceUI(status[behavior]);
 }
 $('#motion-state').textContent=`Estado actual: ${behaviorLabels[behavior][0]}`;
 $('#behavior-description').textContent=behaviorLabels[behavior][1];
 document.querySelectorAll('[data-behavior]').forEach(btn=>{
  const selected=btn.dataset.behavior===behavior;
  btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));
 });
 if(manual){demoStates=false;$('#cycle-states').classList.remove('active');$('#cycle-states').setAttribute('aria-pressed','false');}
}
document.querySelectorAll('[data-behavior]').forEach(btn=>btn.addEventListener('click',()=>setBehavior(btn.dataset.behavior)));
$('#cycle-states').addEventListener('click',()=>{
 demoStates=!demoStates;demoClock=0;demoIndex=0;
 $('#cycle-states').classList.toggle('active',demoStates);$('#cycle-states').setAttribute('aria-pressed',String(demoStates));
 if(demoStates)setBehavior(stateOrder[0],false);
});
$('#look-up').addEventListener('click',()=>{
 lookUpUntil=elapsed+3.4;
 $('#look-up').classList.add('active');
});
let chosenVowel='aa', chosenEmotion='neutral';
const mouthSlider = $('#mouth');
const mouthLabel = $('#mouth-name');
const setButtonsActive=(selector, chosen)=>document.querySelectorAll(selector).forEach(el=>el.classList.toggle('active',el===chosen));
const userControl = (id) => Number($(id).value);
const toggles = [
  ['#toggle-live','live'], ['#toggle-blink','blink'], ['#toggle-gaze','gaze'],
  ['#toggle-head','head'], ['#toggle-expression','expression'],
];
for (const [id,key] of toggles) {
  $(id).addEventListener('click',()=>{
    config[key] = !config[key];
    $(id).classList.toggle('active',config[key]);
    $(id).setAttribute('aria-pressed',String(config[key]));
    if(key==='live') $('#motion-state').textContent=config.live?'Movimiento natural activo':'Avatar en reposo fijo';
  });
}
function updateGazeMode() {
  document.querySelectorAll('[data-gaze-mode]').forEach(el=>el.classList.toggle('active',el.dataset.gazeMode===config.gazeMode));
  $('#manual-controls').hidden = config.gazeMode !== 'manual';
  $('#pointer-hint').hidden = config.gazeMode !== 'cursor';
}
document.querySelectorAll('[data-gaze-mode]').forEach(btn=>btn.addEventListener('click',()=>{
  config.gazeMode=btn.dataset.gazeMode;
  updateGazeMode();
}));
updateGazeMode();
for (const [id,key] of [['#gaze-x','manualX'],['#gaze-y','manualY']]) {
  $(id).addEventListener('input',()=>{
    config[key]=userControl(id);
    $(`${id}-label`).textContent=`${Math.round(config[key]*100)}%`;
  });
}
$('#intensity').addEventListener('input',()=>{
  config.intensity=userControl('#intensity')/100;
  $('#intensity-label').textContent=`${Math.round(config.intensity*100)}%`;
});
// Body Motion controls are additive to the approved v0.8 face/voice behavior.
$('#toggle-body').addEventListener('click',()=>{
 config.bodyMotion=!config.bodyMotion;
 const el=$('#toggle-body');el.classList.toggle('active',config.bodyMotion);el.setAttribute('aria-pressed',String(config.bodyMotion));
});
document.querySelectorAll('[data-body-pose]').forEach(btn=>btn.addEventListener('click',()=>{
 config.bodyPose=btn.dataset.bodyPose;
 document.querySelectorAll('[data-body-pose]').forEach(el=>el.classList.toggle('active',el===btn));
}));
$('#body-intensity').addEventListener('input',()=>{
 config.bodyIntensity=userControl('#body-intensity')/100;
 $('#body-intensity-label').textContent=Math.round(config.bodyIntensity*100)+'%';
});
$('#body-speed').addEventListener('input',()=>{
 config.bodySpeed=userControl('#body-speed');
 $('#body-speed-label').textContent=config.bodySpeed.toFixed(1)+'/s';
});
$('#body-wave').addEventListener('click',()=>bodyCore.requestWave());
$('#body-explain').addEventListener('click',()=>bodyCore.requestExplain());
$('#body-point').addEventListener('click',()=>bodyCore.requestPoint());
$('#body-welcome').addEventListener('click',()=>bodyCore.requestWelcome());


// Slider exclusivo para clips FBX: no altera la voz, las expresiones ni la mirada.
$('#mixamo-speed').addEventListener('input',e=>updateClipSpeed(e.target.value));
document.querySelectorAll('[data-mixamo-speed]').forEach(button=>button.addEventListener('click',()=>{
 updateClipSpeed(button.dataset.mixamoSpeed);
 document.querySelectorAll('[data-mixamo-speed]').forEach(b=>b.classList.toggle('active',
  Math.abs(Number(b.dataset.mixamoSpeed)-mixamoState.speed)<.001));
}));
updateClipSpeed(DEFAULT_CLIP_SPEED);

document.querySelectorAll('[data-library-clip]').forEach(el=>el.addEventListener('click',()=>{
 playManualLibraryClip(el.dataset.libraryClip);
}));
$('#mixamo-file').addEventListener('change',async e=>{
 stopDance({immediate:true});
 interruptAutoForManual();
 const file=e.target.files?.[0];if(!file)return;
 try{await importMixamoFile(file);}catch(err){console.error(err);animFeedback('No se pudo importar: '+String(err.message||err),true);}
});
$('#mixamo-play').addEventListener('click',()=>{stopDance({immediate:true});interruptAutoForManual();const ok=playMixamo({loop:false,repetitions:1});if(ok)mixamoState.origin='manual';else releaseManualControl();});
$('#mixamo-stop').addEventListener('click',()=>{stopDance({immediate:true});releaseManualControl();stopMixamo();animFeedback('Animación detenida. Volviendo a reposo.');});
$('#walk-reset').addEventListener('click',()=>{stopDance({immediate:true});releaseManualControl();resetWalkingPosition();});
$('#walk-camera-follow').addEventListener('change',e=>{followWalkingCamera=e.target.checked;});
$('#walk-auto-thinking').addEventListener('change',e=>{circleWalkAuto=!!e.target.checked;motionIntelligence.setCircleEnabled(circleWalkAuto);thinkingSince=elapsed;thinkingAutoTriggered=false;});

for(const [id,key,label] of [
 ['#body-depth','bodyDepth','#body-depth-label'],
 ['#body-wrist','bodyWrist','#body-wrist-label'],
]){$(id).addEventListener('input',()=>{
 config[key]=userControl(id)/100;
 $(label).textContent=Math.round(config[key]*100)+'%';
});}
$('#body-depth-invert').addEventListener('click',()=>{
 config.bodyDepthSign*=-1;
 $('#body-depth-invert').classList.toggle('active',config.bodyDepthSign===-1);
 $('#body-depth-invert').setAttribute('aria-pressed',String(config.bodyDepthSign===-1));
});
// R6 — Compositor libre: los FBX de baile son aportados por el usuario y no se incluyen en el kit.
// Cada una de las tres posiciones define el orden de reproducción. Sin rutinas predefinidas.
function danceStatus(message,error=false){
 const el=$('#dance-sequence-status');if(el){el.textContent=message;el.style.color=error?'#ffbcae':'#b6f0ff';}
}
function currentDanceChoices(){return danceSelections.map(selector=>$(selector).value);}
function danceImportStatus(message){const el=$('#dance-library-status');if(el)el.textContent=message;}
function refreshDanceSelectors(){
 for(const selector of danceSelections){
  const select=$(selector),current=select.value;
  select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='— Sin movimiento —';select.appendChild(placeholder);
  for(const [id,entry] of danceUploads){
   const option=document.createElement('option');option.value=id;option.textContent=entry.label;select.appendChild(option);
  }
  if(danceUploads.has(current))select.value=current;
 }
 updateDanceSelection();
}
function updateDanceSelection(){
 const choices=currentDanceChoices();
 const labels=choices.filter(Boolean).map(id=>danceUploads.get(id)?.label||'Archivo no encontrado');
 const el=$('#dance-order-preview');
 if(el)el.textContent=labels.length?'Orden de reproducción: '+labels.map((name,index)=>`${index+1}. ${name}`).join('  →  '):'Orden: todavía no hay pasos seleccionados.';
 if(!danceState.active&&!danceState.loading){
  try{buildDanceRoutine(choices,Object.fromEntries([...danceUploads].map(([id,entry])=>[id,{category:'baile',label:entry.label}])));
   $('#dance-start').disabled=!vrm;
  }catch{ $('#dance-start').disabled=true; }
 }
}
function updateDanceButtons(){
 $('#dance-pause').disabled=!danceState.active||danceState.stopping;
 $('#dance-stop').disabled=!danceState.loading&&!danceState.active;
 $('#dance-pause').textContent=danceState.paused?'▶ Reanudar baile':'⏸ Pausar baile';
 if(danceState.loading||danceState.active)$('#dance-start').disabled=true;
 else updateDanceSelection();
}
function stopDance({immediate=false}={}){
 if(!danceState.active&&!danceState.loading)return;
 danceState.token++;
 danceState.loading=false;
 if(danceState.active&&!immediate&&danceState.mixer){
  danceState.stopping=true;danceState.paused=false;
  danceState.stopRemaining=.42;
  for(const action of danceState.actions)if(action?.isRunning())action.fadeOut(.42);
  danceStatus('Finalizando baile con transición suave…');
  updateDanceButtons();return;
 }
 if(danceState.mixer){danceState.mixer.stopAllAction();danceState.mixer.uncacheRoot(vrm.scene);}
 danceState.active=false;danceState.paused=false;danceState.stopping=false;danceState.mixer=null;
 danceState.clock=null;danceState.actions=[];danceState.currentIndex=-1;danceState.routine=null;
 updateDanceButtons();
}
function activateDanceStep(index){
 const action=danceState.actions[index];if(!action||!danceState.active)return;
 const prev=danceState.actions[danceState.currentIndex];
 action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;
 action.enabled=true;action.setEffectiveWeight(1);action.setEffectiveTimeScale(mixamoState.speed);
 action.play();
 if(prev&&prev!==action){
  const overlap=danceState.plan[index-1].blend/Math.max(.35,mixamoState.speed);
  prev.crossFadeTo(action,overlap,false);
 }else action.fadeIn(.34/Math.max(.35,mixamoState.speed));
 danceState.currentIndex=index;
 danceStatus(`🎵 Paso ${index+1} de ${danceState.plan.length}: ${danceState.plan[index].label} · ${speedLabel(mixamoState.speed)}`);
}
function updateDanceFrame(dt){
 if(!danceState.active||!danceState.mixer||danceState.paused)return;
 if(danceState.stopping){
  danceState.mixer.update(dt);danceState.stopRemaining-=dt;
  if(danceState.stopRemaining<=0){stopDance({immediate:true});releaseManualControl();danceStatus('Baile detenido. Reposo recuperado.');}
  return;
 }
 const event=danceState.clock.advance(dt*mixamoState.speed);
 if(event?.type==='transition')activateDanceStep(event.index);
 danceState.mixer.update(dt);
 if(event?.type==='finished'){
  stopDance({immediate:false});
  danceStatus('Coreografía personalizada completada · regresando suavemente al reposo.');
 }
}
async function startDance(){
 if(!vrm){danceStatus('Espera a que cargue Lumia.',true);return false;}
 const library=Object.fromEntries([...danceUploads].map(([id,entry])=>[id,{category:'baile',label:entry.label}]));
 let routine;
 try{routine=buildDanceRoutine(currentDanceChoices(),library);}
 catch(err){danceStatus(String(err.message||err),true);return false;}
 stopDance({immediate:true});interruptAutoForManual();stopMixamo({immediate:true});poseBridge.clear();bodyCore.clearGestures();
 const token=++danceState.token;
 danceState.loading=true;danceState.active=false;danceState.routine=routine;
 updateDanceButtons();
 try{
  const assets=[];
  for(let i=0;i<routine.steps.length;i++){
   if(token!==danceState.token)return false;
   const id=routine.steps[i],entry=danceUploads.get(id);
   if(!entry)throw Error('El archivo de baile seleccionado ya no está disponible.');
   danceStatus(`Preparando paso ${i+1}/${routine.steps.length}: ${entry.label}`);
   let result=motionCache.get(id);
   if(!result){
    const url=URL.createObjectURL(entry.file);
    try{
     const fbx=await new FBXLoader().loadAsync(url);
     if(token!==danceState.token)return false;
     result=retargetMixamoUpperBody(fbx,vrm,THREE,{fullBody:true,includeHips:true});
     if(!result.clip?.tracks?.length||result.matched.length<8)throw Error(`El clip ${entry.label} no tiene suficientes huesos compatibles con Lumia.`);
     motionCache.set(id,result);
    }finally{URL.revokeObjectURL(url);}
   }
   assets.push(result);
  }
  if(token!==danceState.token)return false;
  const plan=prepareDancePlan(routine,assets.map(x=>x.duration),library,Number($('#dance-blend').value));
  const mixer=new THREE.AnimationMixer(vrm.scene);
  // Un AnimationAction distinto por posición, incluso si se repite el mismo FBX.
  const actions=assets.map(asset=>mixer.clipAction(asset.clip.clone()));
  danceState.mixer=mixer;danceState.actions=actions;danceState.plan=plan;
  danceState.clock=new DanceSequenceClock(plan);
  danceState.currentIndex=-1;danceState.paused=false;danceState.stopping=false;
  danceState.loading=false;danceState.active=true;
  activateDanceStep(0);updateDanceButtons();return true;
 }catch(err){
  console.error(err);stopDance({immediate:true});releaseManualControl();
  danceStatus(`No se pudo iniciar el baile: ${String(err?.message||err)}`,true);return false;
 }
}
$('#dance-files').addEventListener('change',event=>{
 const files=[...(event.target.files||[])];event.target.value='';
 if(!files.length)return;
 // No procesar el rig de referencia; los FBX solo se leen si se usan en una coreografía.
 let accepted=0;const errors=[];
 for(const file of files){
  if(!/\.fbx$/i.test(file.name)){errors.push(`${file.name}: no es FBX`);continue;}
  if(file.size>45*1024*1024){errors.push(`${file.name}: supera 45 MB`);continue;}
  const total=[...danceUploads.values()].reduce((sum,x)=>sum+x.file.size,0);
  if(danceUploads.size>=12||total+file.size>100*1024*1024){errors.push(`${file.name}: máximo 12 clips o 100 MB por sesión`);continue;}
  if([...danceUploads.values()].some(x=>x.label===file.name&&x.file.size===file.size)){errors.push(`${file.name}: ya agregado`);continue;}
  const id='dance-local-'+(++danceImportCounter);
  danceUploads.set(id,{label:file.name,file});accepted++;
 }
 refreshDanceSelectors();
 danceImportStatus(`${danceUploads.size} FBX de baile cargados en esta sesión${accepted?` · ${accepted} nuevos`:''}${errors.length?' · Avisos: '+errors.join('; '):''}.`);
 if(accepted)danceStatus('Ahora elige el paso 1, el paso 2 y opcionalmente el 3.');
});
for(const selector of danceSelections)$(selector).addEventListener('change',updateDanceSelection);
$('#dance-clear-steps').addEventListener('click',()=>{
 for(const selector of danceSelections)$(selector).value='';
 updateDanceSelection();danceStatus('Pasos limpiados. Los archivos importados siguen disponibles.');
});
$('#dance-clear-library').addEventListener('click',()=>{
 stopDance({immediate:true});releaseManualControl();
 for(const id of danceUploads.keys())motionCache.delete(id);
 danceUploads.clear();refreshDanceSelectors();danceImportStatus('Biblioteca de bailes vacía. Puedes importar otros FBX.');
 danceStatus('Bailes retirados de la sesión.');
});
$('#dance-blend').addEventListener('input',event=>{
 $('#dance-blend-label').textContent=Number(event.target.value).toFixed(2).replace('.',',')+' s';
});
$('#dance-start').addEventListener('click',()=>startDance());
$('#dance-pause').addEventListener('click',()=>{
 if(!danceState.active||danceState.stopping)return;
 danceState.paused=!danceState.paused;updateDanceButtons();
 danceStatus(danceState.paused?'⏸ Coreografía pausada.':'▶ Coreografía reanudada.');
});
$('#dance-stop').addEventListener('click',()=>{
 if(!danceState.active&&!danceState.loading)return;
 stopDance({immediate:false});
 if(!danceState.active){releaseManualControl();danceStatus('Carga cancelada.');}
});
refreshDanceSelectors();updateDanceButtons();

// Simple, explicit API for the future application integration.
window.LUMIA_BODY={
  setPose(pose){
    if(!['natural','formal','open','tpose'].includes(pose))return false;
    config.bodyPose=pose;
    document.querySelectorAll('[data-body-pose]').forEach(el=>el.classList.toggle('active',el.dataset.bodyPose===pose));
    return true;
  },
  gesture(name){
    if(name==='mixamo')return playMixamo();
    if(animationLibrary[name])return playManualLibraryClip(name);
    if(name==='wave'){bodyCore.requestWave();return true;}
    if(name==='explain'){bodyCore.requestExplain();return true;}
    if(name==='point'){bodyCore.requestPoint();return true;}
    if(name==='welcome'){bodyCore.requestWelcome();return true;}
    if(name==='stop'){stopDance({immediate:true});bodyCore.clearGestures();releaseManualControl();stopMixamo();return true;}
    return false;
  },
  enable(enabled){
    config.bodyMotion=!!enabled;
    $('#toggle-body').classList.toggle('active',config.bodyMotion);
    $('#toggle-body').setAttribute('aria-pressed',String(config.bodyMotion));
    return config.bodyMotion;
  },
  setAnimationSpeed(value){return updateClipSpeed(value);},
  getAnimationSpeed(){return mixamoState.speed;},
  setMotionIntelligence:setIntelligenceEnabled,
  setMotionVariety(value){motionIntelligence.setVariety(value);updateIntelligenceUI();return motionIntelligence.variety;},
  setMotionAutoIdle(value){const cb=$('#intelligence-auto-idle');cb.checked=!!value;cb.dispatchEvent(new Event('change'));return motionIntelligence.autoIdleEnabled;},
  setThinkingGestureDelay(value){motionIntelligence.setThinkingDelay(value);updateIntelligenceUI();return motionIntelligence.thinkingDelay;},
  getMotionIntelligence(){return {...motionIntelligence.snapshot(),presence:{...presenceConfig},semantic:semanticMotion.snapshot(),stability:{...stabilityConfig,thinkingRepair:lastThinkingRepair}};},
  getSemanticMotion(){return semanticMotion.snapshot();},
  getVoiceSync(){return {event:conversationEventStatus,session:window.LUMIAConversation?.getSpeechSession?.()??null,poseBlendActive:poseBridge.active,poseBlendEnabled};},
  setPoseBlendEnabled(v){poseBlendEnabled=!!v;$('#r8-pose-blend').checked=poseBlendEnabled;if(!poseBlendEnabled)poseBridge.clear();return poseBlendEnabled;},
  setSemanticMotionEnabled(v){semanticMotion.setEnabled(v);updateSemanticUI();return semanticMotion.enabled;},
  setSemanticMotionIntensity(v){semanticMotion.setIntensity(v);updateSemanticUI();return semanticMotion.intensity;},
  playDanceRoutine(){return startDance();},
  stopDanceRoutine(){stopDance({immediate:true});releaseManualControl();return true;},
  listDanceClips(){return [...danceUploads].map(([id,entry])=>({id,label:entry.label}));},
  setDanceOrder(ids){if(!Array.isArray(ids)||ids.length>3)return false;for(let i=0;i<3;i++){$(danceSelections[i]).value=ids[i]||'';}updateDanceSelection();return true;},
  getDanceOrder(){return currentDanceChoices().filter(Boolean);},
  getDanceState(){return {loading:danceState.loading,active:danceState.active,paused:danceState.paused,routine:danceState.routine?.id||null,stepIndex:danceState.currentIndex,steps:danceState.plan?.length??0};},
  resetWalkingPosition,
  getWalkingState(){return {positionX:stageOffsetX,positionZ:stageOffsetZ,forwardMeters:-stageOffsetZ,cameraFollow:followWalkingCamera,playing:!!forwardWalkController?.active,circleActive:!!circleWalkController?.active,yawDegrees:vrm?Math.round(vrm.scene.rotation.y*180/Math.PI):0};},
  listAnimations(){return motionCatalog.map(({id,label,category,fullBody})=>({id,label,category,fullBody}));},
  getState(){return {motionSync:{voice:conversationEventStatus,poseBlendActive:poseBridge.active,poseBlendEnabled},stability:{...stabilityConfig,thinkingRepair:lastThinkingRepair},motionIntelligence:motionIntelligence.snapshot(),presence:{...presenceConfig},manualOverride:manualLock,walkedMeters:-stageOffsetZ,circleActive:!!circleWalkController?.active,animationSpeed:mixamoState.speed,selectedMotion:selectedMotionId,librarySize:motionCatalog.length,danceActive:danceState.active,dancePaused:danceState.paused,externalAnimationReady:mixamoState.ready,externalAnimationPlaying:mixamoState.active,pose:config.bodyPose,enabled:config.bodyMotion,behavior:config.behavior,loaded:!!vrm,bonesAvailable:bodyBones.size,depth:config.bodyDepth,wrist:config.bodyWrist,depthSign:config.bodyDepthSign};}
};


$('#manual-blink').addEventListener('click',()=>core.requestBlink());
$('#talk').addEventListener('click',()=>{
  config.talking=!config.talking;
  $('#talk').classList.toggle('active',config.talking);
  $('#talk').setAttribute('aria-pressed',String(config.talking));
  $('#talk-label').textContent=config.talking?'Demo vocal activa (sin audio)':'Demo vocal desactivada';
});
$('#mouth').addEventListener('input',()=>{
  $('#mouth-value').textContent=`${Math.round(userControl('#mouth')*100)}%`;
});
document.querySelectorAll('[data-vowel]').forEach(btn=>btn.addEventListener('click',()=>{
  chosenVowel=btn.dataset.vowel;
  mouthLabel.textContent=vocalNames[chosenVowel];
  setButtonsActive('[data-vowel]',btn);
}));
document.querySelectorAll('[data-emotion]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.disabled)return;
  chosenEmotion=btn.dataset.emotion;
  setButtonsActive('[data-emotion]',btn);
}));
for(const [id,key,label,factor] of [
 ['#gaze-power','gazePower','#gaze-power-label',100],
 ['#gaze-speed','gazeResponse','#gaze-speed-label',1],
 ['#head-follow','headFollow','#head-follow-label',100],
 ['#head-power','headPower','#head-power-label',100],
 ['#head-speed','headResponse','#head-speed-label',1],
 ['#emotion-intensity','emotionIntensity','#emotion-intensity-label',100],
]){
 $(id).addEventListener('input',()=>{
  config[key]=userControl(id);
  $(label).textContent=factor===100?`${Math.round(config[key]*100)}%`:`${config[key].toFixed(1)} /s`;
 });
}


// Seguimiento de toda la ventana: permite mirar incluso a los bordes superiores,
// y seguir al cursor sobre el panel de controles. Sólo reacciona al movimiento real.
window.addEventListener('pointermove',e=>{
 const b=renderer.domElement.getBoundingClientRect();
 const x=(e.clientX-b.left)/Math.max(1,b.width);
 const y=(e.clientY-b.top)/Math.max(1,b.height);
 config.cursorInside=true;
 config.cursorX=THREE.MathUtils.clamp(x*2-1,-1,1);
 config.cursorY=THREE.MathUtils.clamp(1-y*2,-1,1);
});
window.addEventListener('blur',()=>{config.cursorInside=false;});
document.addEventListener('pointerleave',()=>{config.cursorInside=false;});

const loader = new GLTFLoader();
loader.register(parser=>new VRMLoaderPlugin(parser));
loader.load('./LUMIA_VITA_NATURAL_V05.vrm', gltf=>{
  vrm=gltf.userData.vrm;
  if(!vrm){ status.textContent='El archivo no se identificó como VRM.'; return; }
  scene.add(vrm.scene);
  animFeedback('Avatar listo. 17 movimientos aprobados y compositor libre de hasta 3 clips FBX de baile.');
  updateDanceButtons();
  if(vrm.lookAt) vrm.lookAt.target=lookTarget;
  headBone=vrm.humanoid?.getNormalizedBoneNode?.('head') || null;
  if(headBone) headOriginalQuaternion.copy(headBone.quaternion);
  for(const boneName of bodyTargets){
    const node=vrm.humanoid?.getNormalizedBoneNode?.(boneName);
    if(node){bodyBones.set(boneName,node);boneBaseRotation.set(boneName,node.quaternion.clone());}
  }
  // Position the arms before the avatar's first visible frame, preventing a T-pose flash.
  for(let i=0;i<55;i++){
    bodyCore.step(.05,config);
    presenceCore.step(.05,{...config,...presenceConfig});
  }
  applyBodyPose(bodyCore.step(.001,config),presenceCore.step(.001,{...config,...presenceConfig}));
  $('#body-availability').textContent=`Huesos corporales disponibles: ${bodyBones.size}/${bodyTargets.length}. Ajuste de pose activo.`;
  const emInfo=buildExpressionMap(vrm.expressionManager);
  status.textContent='Lumia cargada. Motion Intelligence v0.8.5 R8 · 17 movimientos + gestos semánticos suaves + compositor de baile.';
  details.textContent=`VRM v0.5 intacto · Rig corporal intacto · ${headBone?'cabeza activa':'cabeza no disponible'} · ${vrm.lookAt?'mirada VRM activa':'mirada no disponible'} · Estados automáticos y emoción contextual v0.8 · Expresiones: ${emInfo.keys.join(', ')}.`;
}, progress=>{
  if(progress.total) status.textContent=`Cargando Lumia… ${Math.round(100*progress.loaded/progress.total)}%`;
},err=>{
  console.error(err);
  status.textContent='No se pudo cargar Lumia. Comprueba que abriste el BAT y tienes internet para las bibliotecas.';
  details.textContent=String(err);
});

let lastTime = 0, elapsed = 0, uiAccum=0;
function resize() {
  const w=Math.max(1,mount.clientWidth), h=Math.max(1,mount.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();
function renderFrame(now) {
  requestAnimationFrame(renderFrame);
  const dt = lastTime ? Math.min((now-lastTime)/1000,0.05) : 0.016;
  lastTime=now;
  elapsed += dt;
  if(!motionIntelligence.enabled && circleWalkAuto && config.behavior==='thinking' && !thinkingAutoTriggered && !thinkingAutoPending && elapsed-thinkingSince>4 && !mixamoState.active){
    thinkingAutoPending=true;
    playLibraryClip('walkingcircle',{origin:'legacy'}).then(started=>{thinkingAutoTriggered=!!started;thinkingAutoPending=false;
      if(started && config.behavior!=='thinking')stopMixamo();
    }).catch(()=>{thinkingAutoPending=false;thinkingAutoTriggered=true;});
  }
  if(demoStates){
   demoClock+=dt;
   if(demoClock>=7.5){demoClock-=7.5;demoIndex=(demoIndex+1)%stateOrder.length;setBehavior(stateOrder[demoIndex],false);}
  }
  directorTick();
  config.lookUp=elapsed<lookUpUntil;
  if(!config.lookUp)$('#look-up').classList.remove('active');
  const state = core.step(dt, config);
  const bodyState = bodyCore.step(dt,config);
  const presenceState = presenceCore.step(dt,{...config,...presenceConfig});
  if(vrm) {
    const manager=vrm.expressionManager;
    if(manager) {
      for(const name of ['aa','ee','ih','oh','ou','blink','blinkLeft','blinkRight']){
        if(manager.expressionMap[name]) manager.setValue(name,0);
      }
      applyEmotion(manager,dt,state);
      manager.setValue('blink',state.blink);
      let vowel=chosenVowel;
      let mouthValue=userControl('#mouth');
      const cue=getVisemeCue();
      const demoVoice=config.talking||state.demoSpeaking;
      if(cue){
        vowel=cue.vowel;mouthValue=cue.amount;
      }else if(demoVoice){
        // Approximate fallback for external audio when actual phoneme timing is absent.
        const seq=['aa','ih','ee','oh','ou','aa','ee','oh'];
        vowel=seq[Math.floor(elapsed*3.7)%seq.length];
        mouthValue=.13+.48*Math.abs(Math.sin(elapsed*7.4));
      }
      const mouthTarget=Math.min(mouthValue,.88);
      for(const name of ['aa','ee','ih','oh','ou']){
       const old=mouthWeights.get(name)||0;
       const next=old+((name===vowel?mouthTarget:0)-old)*(1-Math.exp(-(name===vowel?21:23)*dt));
       mouthWeights.set(name,next);
       if(manager.expressionMap[name])manager.setValue(name,next);
      }
    }
    if(!danceState.active || !danceState.paused)applyBodyPose(bodyState,presenceState);
    // Mixamo owns upper-body bones during the clip; the facial/head systems remain procedural.
    if(!danceState.active && !danceState.loading && (mixamoState.active||mixamoState.fadeOutRemaining>0)&&mixamoState.mixer){
      // Blend back to the procedural rest pose when a clip finishes or is interrupted.
      if(mixamoState.fadeOutRemaining>0){
        mixamoState.fadeOutRemaining=Math.max(0,mixamoState.fadeOutRemaining-dt);
        mixamoState.action?.setEffectiveWeight(mixamoState.fadeOutRemaining/mixamoState.fadeOutDuration);
      }else{
        mixamoState.fadeInRemaining=Math.max(0,mixamoState.fadeInRemaining-dt);
        const intro=1-mixamoState.fadeInRemaining/mixamoState.fadeInDuration;
        const fullLength=(mixamoState.clip?.duration||0)*mixamoState.repetitions;
        const outro=(!mixamoState.looping && Number.isFinite(fullLength))
          ?Math.min(1,secondsRemaining(fullLength,mixamoState.elapsedSource,mixamoState.speed)/.4):1;
        mixamoState.action?.setEffectiveWeight(Math.min(1,intro,outro));
      }
      mixamoState.mixer.update(dt);
      mixamoState.elapsedSource+=dt*mixamoState.speed;
      // Forward walking uses the FBX root Z curve, which the limb retarget intentionally excludes.
      updateForwardWalk(Math.min(mixamoState.elapsedSource,mixamoState.clip?.duration||0));
      updateCircleWalk(Math.min(mixamoState.elapsedSource,mixamoState.clip?.duration||0));
      if(!mixamoState.active&&mixamoState.fadeOutRemaining===0){
        mixamoState.action?.stop();
        mixamoState.looping=false;
      }
    }
    updateDanceFrame(dt);
    const semanticPose=semanticMotion.step(dt,{speaking:config.behavior==='speaking'&&motionIntelligence.enabled,manual:manualLock,dancing:danceState.active||danceState.loading});
    if(semanticPose.kind&&!danceState.active&&!manualLock)applySemanticBody(semanticPose);
    // Frame-last pose bridge: respects new FBX or procedural pose and avoids a T-pose flash.
    if(!danceState.active && !danceState.loading && poseBlendEnabled)poseBridge.step(dt);
    // World-space gaze target; softened in the pure motion engine.
    lookTarget.position.set(-state.gazeX * 0.77+stageOffsetX, 1.59 + state.gazeY * 0.44, -1.6+stageOffsetZ);
    if(headBone && !(mixamoState.source==='listening' && (mixamoState.active || mixamoState.fadeOutRemaining>0))){
      localEuler.set(state.headPitch+presenceState.headPitch+semanticPose.head.pitch,state.headYaw+semanticPose.head.yaw,state.headRoll+semanticPose.head.roll,'YXZ');
      localDelta.setFromEuler(localEuler);
      headBone.quaternion.copy(headOriginalQuaternion).multiply(localDelta);
    }
    vrm.update(dt);
  }
  controls.update();
  renderer.render(scene,camera);
  uiAccum+=dt;
  if(uiAccum>.35) {
    uiAccum=0;
    runtimeState.textContent = vrm ?
      `${behaviorLabels[state.behavior][0]} · ojos X ${Math.round(state.gazeX*100)} / Y ${Math.round(state.gazeY*100)} · cabeza ${Math.round(state.headYaw*180/Math.PI)}° horizontal / ${Math.round(state.headPitch*180/Math.PI)}° vertical · parpadeos ${state.blinkCount}` : 'Modelo en carga';
  }
}
requestAnimationFrame(renderFrame);
