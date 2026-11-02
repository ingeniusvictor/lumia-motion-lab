/**
 * L.U.M.I.A. Motion Intelligence R2 – Presencia Viva
 * Microanimación PROCEDIMENTAL ADITIVA. No reproduce Dwarf Idle ni altera el VRM.
 * Se aplica sobre el reposo de BodyMotionCore y antes de FBX.
 * Todos los valores devueltos son radianes; transiciones continuas y suaves.
 */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
const rad=deg=>deg*Math.PI/180;
const envelope=(x,start,end)=>{
 const p=clamp((x-start)/(end-start),0,1);
 return Math.sin(Math.PI*p)**2;
};
export const PRESENCE_DEFAULTS=Object.freeze({enabled:true,idleLevel:65,listeningLevel:80});
export class BodyPresenceCore {
 constructor(){
  this.elapsed=0;
  this.idleWeight=0;
  this.listeningWeight=0;
 }
 step(dt,config={}){
  dt=clamp(dt,0,.05);
  this.elapsed+=dt;
  const available=config.enabled!==false&&config.live!==false&&config.bodyMotion!==false&&config.bodyPose!=='tpose';
  const state=config.behavior||'idle';
  const idleTarget=available&&state==='idle'?1:0;
  const listeningTarget=available&&state==='listening'?1:0;
  const lerp=1-Math.exp(-3.5*dt); // entrada/salida ~1 segundo, sin saltos
  this.idleWeight+=(idleTarget-this.idleWeight)*lerp;
  this.listeningWeight+=(listeningTarget-this.listeningWeight)*lerp;
  const i=this.idleWeight*clamp(config.idleLevel??65,0,100)/100;
  const l=this.listeningWeight*clamp(config.listeningLevel??80,0,100)/100;
  const t=this.elapsed;
  const breath=Math.sin(t*2*Math.PI/3.8-.4);
  const sway=Math.sin(t*2*Math.PI/7.8+.2);
  const armL=Math.sin(t*2*Math.PI/7.1+.4);
  const armR=Math.sin(t*2*Math.PI/8.5+1.5);
  // Un discreto reconocimiento por cada 7,6 s cuando escucha, sin repetir cabeceos mecánicos.
  const nod=envelope(t%7.6,2.1,3.5);
  const offsets={
   chestX:rad((1.20*breath)*i +(3.3+.65*breath)*l),
   chestY:rad(.32*sway*i+(.65+.25*sway)*l),
   spineX:rad(.20*breath*i+1.15*l),
   spineZ:rad(.45*sway*i+(.55+.35*sway)*l),
   hipsZ:rad(.38*sway*i+.20*sway*l),
   leftShoulderZ:rad(.35*armL*i+(.8+.40*armL)*l),
   rightShoulderZ:rad(-.35*armR*i-(.8+.40*armR)*l),
   leftUpperArmZ:rad(1.35*armL*i+(-4.8+1.25*armL)*l),
   rightUpperArmZ:rad(-1.35*armR*i+(4.2-1.2*armR)*l),
   leftUpperArmX:rad(.45*breath*i+3.0*l),
   rightUpperArmX:rad(-.45*breath*i-2.8*l),
   leftLowerArmZ:rad(1.25*armR*i+(3.6+1.0*armL)*l),
   rightLowerArmZ:rad(-1.20*armL*i-(3.3+.95*armR)*l),
   leftHandX:rad(1.25*Math.sin(t*.90)*i+1.75*armL*l),
   rightHandX:rad(-1.25*Math.sin(t*.82+1)*i-1.75*armR*l),
  };
  return {offsets,headPitch:rad((.4*breath)*i+(1.0+.45*breath+3.15*nod)*l),
    idleWeight:this.idleWeight,listeningWeight:this.listeningWeight,
    visible:i+l>.08};
 }
}
