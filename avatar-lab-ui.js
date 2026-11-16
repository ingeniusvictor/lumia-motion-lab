/**
 * R9-02: UI controller for switching local character models within Motion Lab.
 * The approved default is kept in memory, never mutated on disk.
 * All user-supplied files remain inside the browser session.
 */
import {AvatarLoadGate,avatarRigReport,validateAvatarFile} from './avatar-lab-core.js';
import {parseLocalAvatar,normalizeGenericAvatar,createEmbeddedPlayer,disposeImportedAvatar} from './avatar-lab-viewer.js';

export function installAvatarLab({
  THREE,GLTFLoader,FBXLoader,VRMLoaderPlugin,scene,
  beforeSwitch=()=>{},onVRM=()=>{},onGeneric=()=>{},onFrame=()=>{},
  onOwnAnimation=()=>{},
}) {
  const $=id=>document.getElementById(id);
  const gate=new AvatarLoadGate();
  const input=$('avatar-model-file');
  const sidecarInput=$('avatar-extra-files');
  const current=$('avatar-current'),status=$('avatar-loading');
  const restore=$('avatar-restore'),frame=$('avatar-frame');
  const select=$('avatar-animation'),play=$('avatar-animation-play'),stop=$('avatar-animation-stop');
  const loop=$('avatar-loop'),speed=$('avatar-animation-speed');
  const speedLabel=$('avatar-animation-speed-label');
  const rotateX=$('avatar-rotate-x'),rotateY=$('avatar-rotate-y');
  const gallery=$('avatar-session-select'),clearList=$('avatar-clear-list');
  const recentFiles=new Map();let nextRecent=0,selectedKey='original';
  let original=null,active=null,uiTimer=0;
  function refreshGallery(){
    gallery.replaceChildren();
    if(original){const option=document.createElement('option');option.value='original';option.textContent='LUMIA Natural V0.5 · aprobado';gallery.add(option);}
    for(const [key,entry] of recentFiles){
      const option=document.createElement('option');option.value=key;option.textContent=entry.file.name;gallery.add(option);
    }
    gallery.disabled=recentFiles.size===0;
    clearList.disabled=recentFiles.size===0||!original;
    if(gallery.querySelector('option[value="'+selectedKey+'"]'))gallery.value=selectedKey;
  }

  function writeStatus(message,error=false){
    status.textContent=message;
    status.style.color=error?'#ffb9a9':'#b6f0ff';
  }
  function ownsAnimation(){
    return !!active?.player?.snapshot().playing;
  }
  function refreshPlayer(){
    const clips=active?.inventory||[];
    const any=clips.length>0;
    const snapshot=active?.player?.snapshot();
    select.disabled=!any;
    play.disabled=!any;
    stop.disabled=!snapshot?.playing;
    speed.disabled=!any;
    loop.disabled=!any;
    if(snapshot?.playing){
      const name=active.inventory.find(item=>item.index===snapshot.index)?.name||'Clip interno';
      writeStatus((snapshot.paused?'Pausa':'Reproduciendo')+' · '+name+
        ' · '+active.format.toUpperCase()+' · sin alterar los archivos originales');
    }
  }
  function refreshModelUI(){
    if(!active)return;
    const isDefault=active===original;
    const s=active.report;
    current.textContent=(isDefault?'Referencia aprobada':'Modelo de prueba')+': '+active.name+' · '+active.format.toUpperCase()+
      ' · mallas '+s.meshes+' · huesos '+s.bones+' · skinned '+s.skinned+
      ' · morphs '+s.morphTargets+' · clips '+active.inventory.length;
    restore.disabled=isDefault;
    frame.disabled=false;
    rotateX.disabled=active.mode!=='generic';
    rotateY.disabled=active.mode!=='generic';
    select.replaceChildren();
    if(!active.inventory.length){
      const option=document.createElement('option');
      option.value='';option.textContent='Este modelo no incluye animaciones propias';
      select.add(option);
    }else {
      active.inventory.forEach((item,i)=>{
        const option=document.createElement('option');
        option.value=String(item.index);
        option.textContent=(i+1)+'. '+item.name+' ('+item.seconds+'s, '+item.tracks+' pistas)';
        select.add(option);
      });
    }
    refreshPlayer();
  }
  function releaseCurrent(){
    if(!active)return;
    active.player?.dispose();
    scene.remove(active.root);
    if(active!==original){disposeImportedAvatar(active.model);active.releaseSidecars?.();}
  }
  function switchTo(next){
    beforeSwitch();
    releaseCurrent();
    active=next;
    scene.add(next.root);
    if(next.mode==='vrm')onVRM(next.vrm,next);
    else onGeneric(next);
    refreshModelUI();
    onFrame(next);
  }
  function readyDefault(vrm){
    if(!vrm?.scene)throw new Error('El VRM original no tiene escena.');
    const report=avatarRigReport(vrm.scene,vrm);
    original={
      name:'LUMIA Natural V0.5',format:'vrm',mode:'vrm',
      root:vrm.scene,model:vrm.scene,vrm,report,
      inventory:[],player:null,isDefault:true,
    };
    input.disabled=false;
    switchTo(original);
    selectedKey='original';refreshGallery();
    writeStatus('Modelo original aprobado listo · motor Motion R8/R9 activo.');
  }
  function defaultFailed(message){
    input.disabled=false;
    writeStatus('No cargó el VRM original. Puedes intentar un personaje externo. '+message,true);
  }
  async function importFile(file,recentKey=null,selectedSidecars=null){
    if(!file)return;
    const resources=selectedSidecars??[...(sidecarInput?.files||[])];
    let info;
    try { info=validateAvatarFile(file); }
    catch(err){writeStatus(String(err.message||err),true);return;}
    const token=gate.next();
    writeStatus('Leyendo '+info.name+' localmente · '+(info.bytes/1048576).toFixed(1)+' MB…');
    input.disabled=true;
    let candidate=null;
    try{
      candidate=await parseLocalAvatar(file,{THREE,GLTFLoader,FBXLoader,VRMLoaderPlugin,resources});
      if(!gate.isCurrent(token)){disposeImportedAvatar(candidate.model);candidate.releaseSidecars?.();return;}
      const compatible=!!candidate.vrm && candidate.report.vrmHumanoid;
      let root=candidate.model;
      let normalized=null;
      if(!compatible){
        normalized=normalizeGenericAvatar(THREE,candidate.model);
        root=normalized.wrapper;
      }
      const player=candidate.inventory.length
        ?createEmbeddedPlayer(THREE,candidate.model,candidate.clips)
        :null;
      const next={
        name:info.name,format:candidate.kind,mode:compatible?'vrm':'generic',
        vrm:compatible?candidate.vrm:null,root,model:candidate.model,
        report:candidate.report,inventory:candidate.inventory,player,
        normalized,isDefault:false,releaseSidecars:candidate.releaseSidecars,
      };
      switchTo(next);
      if(recentKey&&recentFiles.has(recentKey)){selectedKey=recentKey;}
      else{
        const found=[...recentFiles].find(([,entry])=>entry.file.name===file.name&&entry.file.size===file.size&&entry.file.lastModified===file.lastModified);
        if(found){selectedKey=found[0];recentFiles.set(selectedKey,{file,resources});}
        else{
          const key='local-'+(++nextRecent);selectedKey=key;
          recentFiles.set(key,{file,resources});
          if(recentFiles.size>12)recentFiles.delete(recentFiles.keys().next().value);
        }
      }
      refreshGallery();
      if(next.mode==='generic'){
        if(next.player){
          const index=next.inventory[0].index;
          next.player.play(index,{loop:loop.checked,speed:Number(speed.value)/100});
          onOwnAnimation(true);
        }
        writeStatus('Personaje '+info.kind.toUpperCase()+' abierto. '+next.inventory.length+' animaciones propias. '+
          'Sin VRM humanoide: no se fuerza retarget R8/R9.');
      }else{
        writeStatus('Personaje VRM humanoide detectado. Motor R8/R9 disponible; prueba los controles originales.');
      }
      refreshPlayer();
    }catch(err){
      if(gate.isCurrent(token)){
        console.error('[Motion R9 avatar] No se pudo cargar el personaje:',err);
        writeStatus('No se pudo cargar '+info.name+': '+String(err?.message||err)+'. Se conserva el personaje anterior.',true);
      }
      if(candidate && candidate.model && candidate.model!==active?.model){
        disposeImportedAvatar(candidate.model);candidate.releaseSidecars?.();
      }
    }finally{
      if(gate.isCurrent(token))input.disabled=false;
      input.value='';
      if(!gate.isCurrent(token))return;
      refreshGallery();
    }
  }

  input.addEventListener('change',(event)=>{void importFile(event.target.files?.[0]);});
  restore.addEventListener('click',()=>{
    gate.next();input.disabled=false;
    if(!original)return;
    if(active===original){
      writeStatus('LUMIA Natural V0.5 ya está activa.');
      return;
    }
    switchTo(original);
    selectedKey='original';refreshGallery();
    writeStatus('Referencia original restaurada. Motion R8/R9 disponible.');
  });
  gallery.addEventListener('change',()=>{
    const key=gallery.value;
    if(key===selectedKey)return;
    if(key==='original'){restore.click();return;}
    const entry=recentFiles.get(key);
    if(entry)void importFile(entry.file,key,entry.resources);
  });
  clearList.addEventListener('click',()=>{
    if(!original)return;
    restore.click();recentFiles.clear();refreshGallery();
    writeStatus('Lista de personajes de prueba vaciada; LUMIA original restaurada.');
  });
  frame.addEventListener('click',()=>{if(active)onFrame(active);});
  play.addEventListener('click',()=>{
    if(!active?.player)return;
    const index=Number(select.value);
    if(!Number.isSafeInteger(index))return;
    onOwnAnimation(true);
    const didPlay=active.player.play(index,{loop:loop.checked,speed:Number(speed.value)/100});
    if(!didPlay)writeStatus('Esta pista no contiene una animación reproducible.',true);
    refreshPlayer();
  });
  stop.addEventListener('click',()=>{
    active?.player?.stop();
    onOwnAnimation(false);
    writeStatus('Animación propia detenida. Control normal del modelo recuperado.');
    refreshPlayer();
  });
  speed.addEventListener('input',()=>{
    speedLabel.textContent=speed.value+'%';
    active?.player?.rotateSpeed(Number(speed.value)/100);
  });
  rotateX.addEventListener('click',()=>{
    if(active?.mode!=='generic')return;
    active.root.rotation.x+=Math.PI/2;
    writeStatus('Orientación del personaje: eje X +90°.');
  });
  rotateY.addEventListener('click',()=>{
    if(active?.mode!=='generic')return;
    active.root.rotation.y+=Math.PI/2;
    writeStatus('Orientación del personaje: eje Y +90°.');
  });
  return {
    readyDefault,defaultFailed,
    step(dt){
      active?.player?.step(dt);
      uiTimer+=dt;
      if(uiTimer>.7){uiTimer=0;refreshPlayer();}
    },
    ownsAnimation,
    stopOwnAnimation(){
      if(!active?.player)return false;
      active.player.stop();onOwnAnimation(false);refreshPlayer();return true;
    },
    isGeneric(){return active?.mode==='generic';},
    isReady(){return !!active;},
    snapshot(){
      return active?{
        name:active.name,format:active.format,mode:active.mode,
        isDefault:active===original,report:active.report,
        animations:active.inventory,playback:active.player?.snapshot()||null,
      }:null;
    },
  };
}
