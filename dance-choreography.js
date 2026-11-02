// L.U.M.I.A. Motion R6 — composición libre de 1 a 3 pasos FBX locales.
// Sin secuencias prefijadas. El orden de las posiciones 1, 2 y 3 es el orden de reproducción.
export const MAX_DANCE_STEPS=3;
export const clampOverlap=(requested,duration,nextDuration)=>
 Math.max(.06,Math.min(requested,Math.max(.06,duration*.24),Math.max(.06,nextDuration*.24)));
export function buildDanceRoutine(choices, library){
 if(!Array.isArray(choices)||choices.length!==MAX_DANCE_STEPS)throw Error('Configura las tres posiciones del compositor');
 const steps=[];let foundGap=false;
 for(const id of choices){
  if(!id){foundGap=true;continue;}
  if(foundGap)throw Error('Completa los pasos en orden: 1, después 2 y después 3. No dejes huecos.');
  if(!library[id]||library[id].category!=='baile')throw Error('Selecciona un FBX de baile válido.');
  steps.push(id);
 }
 if(!steps.length)throw Error('Agrega al menos un movimiento de baile y selecciónalo como paso 1.');
 return {id:'custom',label:'Baile personalizado',steps};
}
export function prepareDancePlan(routine,durations,catalog,requestedBlend=.38){
 if(!routine||!Array.isArray(routine.steps)||routine.steps.length<1||routine.steps.length>MAX_DANCE_STEPS)throw Error('Secuencia inválida: admite entre 1 y 3 pasos.');
 if(routine.steps.length!==durations.length)throw Error('Duraciones incompletas');
 return routine.steps.map((id,i)=>{
  const duration=Number(durations[i]);
  if(!catalog[id]||catalog[id].category!=='baile'||!Number.isFinite(duration)||duration<=0)throw Error('Movimiento de baile inválido: '+id);
  return {id,label:catalog[id].label,duration,blend:i<durations.length-1?clampOverlap(Math.max(.1,Math.min(.7,requestedBlend)),duration,durations[i+1]):0};
 });
}
export class DanceSequenceClock {
 constructor(plan){if(!Array.isArray(plan)||plan.length<1||plan.length>MAX_DANCE_STEPS)throw Error('Plan inválido');this.plan=plan;this.index=0;this.elapsed=0;this.finished=false;}
 advance(dt){
  if(this.finished)return null;
  this.elapsed+=Math.max(0,Number.isFinite(dt)?dt:0);
  const last=this.index===this.plan.length-1;
  if(last&&this.elapsed>=this.plan[this.index].duration){this.finished=true;return {type:'finished',index:this.index};}
  if(!last&&this.elapsed>=this.plan[this.index].duration-this.plan[this.index].blend){
   // El siguiente clip empieza durante el blend y su reloj comienza en cero.
   this.index++;this.elapsed=0;return {type:'transition',index:this.index};
  }
  return null;
 }
}
