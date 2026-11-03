/** LUMIA Natural Motion v0.7b. Estado conductual y mirada/cabeza independiente del VRM. */
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const smooth=(a,b,dt,r)=>a+(b-a)*(1-Math.exp(-r*dt));
const DEG=Math.PI/180;
const STATES=new Set(['idle','listening','thinking','speaking']);
export class NaturalMotionCore {
 constructor(random=Math.random){
  this.random=random;this.elapsed=0;this.behavior='idle';this.behaviorTime=0;
  this.nextBlink=this.pick(1.6,3.6);this.blinkTime=0;this.blinkDuration=.22;
  this.blinkActive=false;this.doubleBlink=false;this.manualBlink=false;
  this.saccadeTimer=.5;this.saccadeX=0;this.saccadeY=0;
  this.idleX=0;this.idleY=0;this.gazeX=0;this.gazeY=0;
  this.headYaw=0;this.headPitch=0;this.headRoll=0;
  this.blink=0;this.smile=0;this.blinkCount=0;
 }
 pick(a,b){return a+(b-a)*this.random();}
 requestBlink(){this.blinkTime=0;this.blinkDuration=this.pick(.16,.23);this.blinkActive=true;this.manualBlink=true;this.doubleBlink=false;}
 step(dt,options={}){
  dt=clamp(Number.isFinite(dt)?dt:0,0,.05);
  this.elapsed+=dt;
  const behavior=STATES.has(options.behavior)?options.behavior:'idle';
  if(behavior!==this.behavior){this.behavior=behavior;this.behaviorTime=0;this.saccadeTimer=0.05;}
  this.behaviorTime+=dt;
  const live=options.live!==false;
  const blinkOn=live&&options.blink!==false;
  const gazeOn=live&&options.gaze!==false;
  const headOn=live&&options.head!==false;
  const expressionOn=live&&options.expression!==false;
  const intensity=clamp(options.intensity??.65,0,1);
  const gazePower=clamp(options.gazePower??.95,.2,1.25);
  const gazeResponse=clamp(options.gazeResponse??12,2,24);
  const headFollow=clamp(options.headFollow??.8,0,1);
  const headPower=clamp(options.headPower??.9,.2,1.4);
  const headResponse=clamp(options.headResponse??7.5,2,14);
  const mode=options.gazeMode||'ambient';
  const lookUp=live&&options.lookUp===true;
  const demoSpeaking=behavior==='speaking';
  
  // Parpadeo irregular, con personalidad según estado.
  const interval=behavior==='listening'?[3.2,6.0]:behavior==='thinking'?[3.1,5.7]:behavior==='speaking'?[2.6,4.8]:[2.7,5.5];
  if(!blinkOn&&!this.manualBlink){this.blinkActive=false;this.blink=0;}
  if(!this.blinkActive && blinkOn){
   this.nextBlink-=dt;
   if(this.nextBlink<=0){
    this.blinkActive=true;this.blinkTime=0;
    this.blinkDuration=this.pick(.16,.26);
    this.doubleBlink=this.random()<.12;
    this.nextBlink=this.pick(...interval);
    this.blinkCount++;
   }
  }
  if(this.blinkActive){
   this.blinkTime+=dt;
   const p=clamp(this.blinkTime/this.blinkDuration,0,1);
   this.blink=p<.4?Math.sin((p/.4)*Math.PI/2):Math.cos(((p-.4)/.6)*Math.PI/2);
   if(p>=1){this.blink=0;this.blinkActive=false;this.manualBlink=false;
    if(this.doubleBlink){this.nextBlink=.16;this.doubleBlink=false;}}
  } else this.blink=0;

  // Mirada: prioridad a prueba de arriba, luego control manual, luego cursor.
  // En 'pensando' mira arriba y hacia un lado deliberadamente; esto diferencia el estado.
  let x=0,y=0;
  const manual=mode==='manual';
  const trackCursor=mode==='cursor'&&options.cursorInside===true;
  if(gazeOn){
   if(lookUp){x=0;y=1;}
   else if(manual){x=clamp(options.manualX??0,-1,1);y=clamp(options.manualY??0,-1,1);}
   else if(behavior==='thinking'){
    x=.37+.09*Math.sin(this.behaviorTime*.55);
    y=.66+.1*Math.sin(this.behaviorTime*.43);
   }
   else if(trackCursor){x=clamp(options.cursorX??0,-1,1);y=clamp(options.cursorY??0,-1,1);}
   else if(behavior==='listening'){x=.035*Math.sin(this.elapsed*.45);y=.035;}
   else{
    this.saccadeTimer-=dt;
    if(this.saccadeTimer<=0){
     const range=behavior==='speaking'?.18:.25;
     this.saccadeX=this.pick(-range,range);this.saccadeY=this.pick(-.13,.16);
     this.saccadeTimer=behavior==='speaking'?this.pick(.8,1.6):this.pick(1.3,3.0);
    }
    this.idleX=smooth(this.idleX,this.saccadeX,dt,2.6);
    this.idleY=smooth(this.idleY,this.saccadeY,dt,2.6);
    x=this.idleX;y=this.idleY;
   }
  }
  const fast=lookUp||trackCursor||manual;
  const response=fast?gazeResponse:Math.min(gazeResponse,behavior==='thinking'?5.4:6.8);
  this.gazeX=smooth(this.gazeX,clamp(x*gazePower,-.98,.98),dt,response);
  this.gazeY=smooth(this.gazeY,clamp(y*gazePower,-.90,.90),dt,response);

  // Coordinación ocular/cabeza. La mirada hacia arriba necesita mayor pitch
  // que en R3; sigue limitada y vuelve suavemente al reposo.
  const t=this.elapsed;
  const activeTracking=(fast||behavior==='thinking'||behavior==='listening');
  const trackingScale=headFollow*headPower*(activeTracking?1:.27);
  const idleScale=intensity*(behavior==='thinking'?.42:behavior==='listening'?.48:behavior==='speaking'?.92:1);
  const idleYaw=(Math.sin(t*.41)*.65+Math.sin(t*.93)*.28)*idleScale;
  const idlePitch=(Math.sin(t*.74)*.43+Math.sin(t*1.20)*.26)*idleScale;
  const nod=behavior==='listening'?.65*Math.sin(t*2.1):behavior==='speaking'?1.4*Math.sin(t*3.2):0;
  const thinkingTilt=behavior==='thinking'?2.0:0;
  const upFactor=this.gazeY>=0?23.0:14.5;
  const desiredYaw=clamp(idleYaw*1.7+this.gazeX*20.2*trackingScale,-22,22);
  const desiredPitch=clamp(idlePitch*1.6+nod+this.gazeY*upFactor*trackingScale,-15,20);
  const desiredRoll=clamp((Math.sin(t*.62)*.6*idleScale)+this.gazeX*1.8*trackingScale+thinkingTilt,-4.5,4.5);
  this.headYaw=smooth(this.headYaw,headOn?desiredYaw*DEG:0,dt,headResponse);
  this.headPitch=smooth(this.headPitch,headOn?desiredPitch*DEG:0,dt,headResponse*.88);
  this.headRoll=smooth(this.headRoll,headOn?desiredRoll*DEG:0,dt,Math.max(2.5,headResponse*.58));
  const smileBase=behavior==='speaking'?.12:behavior==='listening'?.065:behavior==='thinking'?.025:.048;
  const smileGoal=expressionOn?clamp(smileBase+(.014*Math.sin(t*.52))*(.4+intensity),0,.17):0;
  this.smile=smooth(this.smile,smileGoal,dt,1.8);
  return {
   behavior,behaviorTime:this.behaviorTime,blink:this.blink,blinkCount:this.blinkCount,
   gazeX:this.gazeX,gazeY:this.gazeY,headYaw:this.headYaw,headPitch:this.headPitch,
   headRoll:this.headRoll,smile:this.smile,demoSpeaking,
  };
 }
}
