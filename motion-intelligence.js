/** L.U.M.I.A. Motion Intelligence v0.8.5
 * Motor de decisión puro: nunca manipula huesos, voz ni escena directamente.
 * La reproducción se delega al adaptador FBX del visor.
 */
const VALID_STATES=new Set(['idle','listening','thinking','speaking']);
const SAFE_GESTURES=new Set(['listening','talking','idle','thinking','pointing','pointinggesture','no','happy','excited','surprised','clapping','walkingcircle']);
export const MOTION_INTELLIGENCE_DEFAULTS=Object.freeze({enabled:true,variety:55,allowCircle:false,autoIdleEnabled:true,allowTalkInterruptions:false,thinkingDelay:.65,idleDelay:.60,speakingDelay:.25});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));

export class MotionIntelligence {
 constructor(options={}){
  this.enabled=options.enabled??true;
  this.variety=clamp(options.variety??55,0,100);
  this.allowCircle=!!options.allowCircle;
  // R3: el reposo conserva Dwarf Idle; escuchar utiliza una postura propia sin FBX.
  this.autoIdleEnabled=!!(options.autoIdleEnabled??MOTION_INTELLIGENCE_DEFAULTS.autoIdleEnabled);
  this.allowTalkInterruptions=!!(options.allowTalkInterruptions??MOTION_INTELLIGENCE_DEFAULTS.allowTalkInterruptions);
  this.thinkingDelay=clamp(options.thinkingDelay??MOTION_INTELLIGENCE_DEFAULTS.thinkingDelay,0,1.5);
  this.idleDelay=clamp(options.idleDelay??MOTION_INTELLIGENCE_DEFAULTS.idleDelay,0,2);
  this.speakingDelay=clamp(options.speakingDelay??MOTION_INTELLIGENCE_DEFAULTS.speakingDelay,0,2);
  this.state='idle';this.stateSince=0;this.revision=0;this.firstGesture=true;
  this.lastAccentAt=-Infinity;this.lastAccentId=null;this.accentIndex=0;
  this.circleTriggered=false;this.emotionConsumed=false;this.deferUntil=0;
  this.lastDecision=null;
 }
 setEnabled(value){this.enabled=!!value;this.revision++;this.lastDecision=null;return this.enabled;}
 invalidate(){this.revision++;this.lastDecision=null;}
 setVariety(value){this.variety=clamp(value,0,100);return this.variety;}
 setCircleEnabled(value){this.allowCircle=!!value;return this.allowCircle;}
 setAutoIdleEnabled(value){this.autoIdleEnabled=!!value;this.invalidate();return this.autoIdleEnabled;}
 setAllowTalkInterruptions(value){this.allowTalkInterruptions=!!value;this.invalidate();return this.allowTalkInterruptions;}
 setThinkingDelay(value){this.thinkingDelay=clamp(value,0,1.5);return this.thinkingDelay;}
 postpone(now,seconds=1){this.deferUntil=Math.max(this.deferUntil,now+seconds);}
 observe(state,now){
  if(!VALID_STATES.has(state))return false;
  if(state===this.state)return false;
  this.state=state;this.stateSince=now;this.revision++;
  this.firstGesture=true;this.lastAccentAt=-Infinity;this.lastAccentId=null;
  this.circleTriggered=false;this.emotionConsumed=false;this.lastDecision=null;
  return true;
 }
 /** Retorna intención o null. No reserva nada: commit() solo tras reproducción real. */
 decide({now=0,state=this.state,activeId=null,active=false,transitioning=false,manual=false,pending=false,emotion=null}={}){
  this.observe(state,now);
  if(!this.enabled||manual||pending||transitioning||now<this.deferUntil)return null;
  const choose=(id,reason)=>({id,reason,revision:this.revision});
  if(this.state==='listening')return active&&activeId==='listening'?null:choose('listening','Escucha FBX dedicada');
  if(this.state==='idle'){
   if(!this.autoIdleEnabled || now-this.stateSince<this.idleDelay)return null;
   return active&&activeId==='idle'?null:choose('idle','Reposo FBX');
  }
  if(this.state==='thinking'){
   if(this.allowCircle&&!this.circleTriggered&&now-this.stateSince>=4){
    return active&&activeId==='walkingcircle'?null:choose('walkingcircle','Paseo reflexivo opcional');
   }
   if(this.firstGesture){
    // Un estado Pensando fugaz (antes de TTS) NO dispara una pose entera.
    return now-this.stateSince>=this.thinkingDelay ? choose('thinking','Pensando tras pausa de estabilización') : null;
   }
   return null; // R1: nunca sustituir el gesto de pensamiento por Dwarf Idle automático
  }
  if(this.state==='speaking'){
   if(now-this.stateSince<this.speakingDelay)return null;
   if(active&&activeId!=='talking')return null; // dejar acabar cada gesto breve
   if(!active)return choose('talking','Conversación corporal');
   // Evita sustituir Talking a mitad de un ciclo por otro clip: provocaba saltos a la pose base.
   if(!this.allowTalkInterruptions)return null;
   const strength=clamp(emotion?.intensity??0,0,1);
   const mood=String(emotion?.emotion||'neutral').toLowerCase();
   if(!this.emotionConsumed && now-this.stateSince>=1.2 && strength>=.47){
    const reaction={happy:'happy',surprised:'surprised',angry:'no',curious:'pointinggesture'}[mood];
    if(reaction)return choose(reaction,`Reacción contextual: ${mood}`);
   }
   // Evita gesticular de forma continua: intervalo 6–14 segundos según variedad.
   const interval=14-this.variety*.08;
   if(this.variety>=15 && now-this.stateSince>=2.6 && now-this.lastAccentAt>=interval){
    const accents=['pointinggesture','pointing','thinking'];
    let index=this.accentIndex%accents.length;
    if(accents[index]===this.lastAccentId)index=(index+1)%accents.length;
    return choose(accents[index],'Gesto de explicación ocasional');
   }
  }
  return null;
 }
 commit(intent,now){
  if(!intent||!SAFE_GESTURES.has(intent.id)||intent.revision!==this.revision)return false;
  this.lastDecision={id:intent.id,reason:intent.reason,at:now};
  if(this.state==='thinking'){
   if(intent.id==='thinking')this.firstGesture=false;
   if(intent.id==='walkingcircle'){this.circleTriggered=true;this.firstGesture=false;}
  }
  if(this.state==='speaking'){
   if(intent.id!=='talking'){
    this.lastAccentAt=now;
    this.lastAccentId=intent.id;
    if(!['pointing','pointinggesture','thinking'].includes(intent.id))this.emotionConsumed=true;
    else this.accentIndex++;
   }
  }
  return true;
 }
 snapshot(){return {enabled:this.enabled,variety:this.variety,allowCircle:this.allowCircle,autoIdleEnabled:this.autoIdleEnabled,allowTalkInterruptions:this.allowTalkInterruptions,thinkingDelay:this.thinkingDelay,state:this.state,revision:this.revision,lastDecision:this.lastDecision?{...this.lastDecision}:null,circleTriggered:this.circleTriggered};}
}
