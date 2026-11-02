/** L.U.M.I.A. R7 - gestos semánticos de baja amplitud sobre el FBX Talking.
 * No inicia ni detiene acciones del AnimationMixer ni altera VRM/FBX.
 * Las señales vienen del texto que realmente pronuncia el navegador TTS.
 */
const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
const rad=x=>x*Math.PI/180;
const types=Object.freeze({
 affirm:{label:'Afirmación',duration:1.10},deny:{label:'Negación',duration:1.35},
 explain:{label:'Explicación',duration:1.65},celebrate:{label:'Alegría',duration:1.45},
 surprise:{label:'Sorpresa',duration:1.15},comfort:{label:'Empatía',duration:1.60},
 greet:{label:'Saludo verbal',duration:1.25},think:{label:'Reflexión',duration:1.45},
});
const rules=[
 ['deny',/(?:^|[^\p{L}])(no estoy de acuerdo|no es correcto|no puedo|no tengo|en absoluto|nunca|jam[aá]s|de ninguna manera)(?=$|[^\p{L}])/giu],
 ['affirm',/(?:^|[^\p{L}])(s[ií],?\s*(?:claro|exacto|por supuesto|as[ií] es)|de acuerdo|exactamente|correcto|efectivamente|tienes raz[oó]n)(?=$|[^\p{L}])/giu],
 ['celebrate',/(?:^|[^\p{L}])(felicidades|enhorabuena|lo conseguimos|lo lograste|qu[eé] alegr[ií]a|fant[aá]stico|excelente|maravilloso)(?=$|[^\p{L}])/giu],
 ['surprise',/(?:^|[^\p{L}])(qu[eé] sorpresa|incre[ií]ble|vaya sorpresa|no me lo esperaba|sorprendente)(?=$|[^\p{L}])/giu],
 ['comfort',/(?:^|[^\p{L}])(lo siento|lamento|entiendo c[oó]mo te sientes|puedes contar conmigo|te escucho)(?=$|[^\p{L}])/giu],
 ['greet',/(?:^|[^\p{L}])(hola|buenos d[ií]as|buenas tardes|buenas noches|bienvenid[oa])(?=$|[^\p{L}])/giu],
 ['think',/(?:^|[^\p{L}])(d[eé]jame pensar|veamos|analicemos|consideremos)(?=$|[^\p{L}])/giu],
 ['explain',/(?:^|[^\p{L}])(primero|segundo|por ejemplo|en primer lugar|esto significa|te explico|podemos hacer|hay que|vamos a|es decir|la idea es|para ello)(?=$|[^\p{L}])/giu]
];
export const SEMANTIC_DEFAULTS=Object.freeze({enabled:true,intensity:48,maxCues:3});
export function planSemanticCues(text,{maxCues=3}={}){
 const source=String(text??'').slice(0,5000), candidates=[];
 if(!source.trim())return [];
 for(const [kind,re] of rules){
  re.lastIndex=0;
  for(const m of source.matchAll(re)){
   const offset=m.index+m[0].indexOf(m[1]);
   candidates.push({kind,label:types[kind].label,offset,match:m[1],duration:types[kind].duration});
  }
 }
 candidates.sort((a,b)=>a.offset-b.offset || a.match.length-b.match.length);
 const chosen=[];
 for(const c of candidates){
  if(chosen.length>=clamp(maxCues,0,3))break;
  // No superponer dos intenciones detectadas en una misma frase corta.
  if(chosen.some(x=>Math.abs(x.offset-c.offset)<20))continue;
  chosen.push(c);
 }
 return chosen;
}
function poseAt(kind,p,intensity){
 const fade=Math.sin(Math.PI*clamp(p,0,1))**2, a=clamp(intensity,0,100)/100;
 const v=a*fade;
 const head={pitch:0,yaw:0,roll:0}, body={};
 if(kind==='affirm'){head.pitch=rad(5.2)*Math.sin(3*Math.PI*p)*v;}
 else if(kind==='deny'){head.yaw=rad(7.5)*Math.sin(4*Math.PI*p)*v;}
 else if(kind==='think'){head.roll=rad(4)*v;head.pitch=rad(-2.6)*v;}
 else if(kind==='comfort'){head.pitch=rad(3.0)*v;body.leftUpperArmZ=rad(-2.8)*v;}
 else if(kind==='surprise'){head.pitch=rad(-4.2)*v;body.rightUpperArmZ=rad(4.0)*v;}
 else if(kind==='greet'){head.roll=rad(2.6)*v;body.rightUpperArmZ=rad(-4.8)*v;body.rightLowerArmX=rad(2)*v;}
 else if(kind==='celebrate'){head.pitch=rad(-2.5)*v;body.leftUpperArmZ=rad(5.8)*v;body.rightUpperArmZ=rad(-5.8)*v;}
 else if(kind==='explain'){body.leftUpperArmZ=rad(4.8)*v;body.rightUpperArmZ=rad(-4.8)*v;body.rightLowerArmX=rad(3)*v;head.yaw=rad(1.3)*v;}
 return {head,body,weight:v};
}
export class SemanticMotionCore {
 constructor(opts={}){
  this.enabled=opts.enabled??SEMANTIC_DEFAULTS.enabled;
  this.intensity=clamp(opts.intensity??SEMANTIC_DEFAULTS.intensity,0,100);
  this.reset();
 }
 reset(){this.text='';this.plan=[];this.elapsed=0;this.offset=0;this.lastEvent=-Infinity;this.boundaries=0;this.next=0;this.active=null;this.started=false;this.lastCue=null;this.lastAt=-Infinity;this.latestBoundaryAt=-Infinity;this.generation=(this.generation||0)+1;}
 begin(text){this.reset();this.text=String(text??'').slice(0,5000);this.plan=planSemanticCues(this.text);this.started=true;return this.plan;}
 boundary(index){if(!this.started)return;this.boundaries++;this.latestBoundaryAt=this.elapsed;this.offset=Math.max(this.offset,clamp(index,0,this.text.length));}
 end(){this.started=false;this.active=null;this.plan=[];}
 setEnabled(value){this.enabled=!!value;if(!this.enabled)this.active=null;return this.enabled;}
 setIntensity(value){this.intensity=clamp(value,0,100);return this.intensity;}
 step(dt,{speaking=false,manual=false,dancing=false}={}){
  dt=clamp(dt,0,.05);
  const empty={head:{pitch:0,yaw:0,roll:0},body:{},kind:null,label:'Sin gesto'};
  if(!this.started||!speaking||!this.enabled||manual||dancing){this.active=null;return empty;}
  this.elapsed+=dt;
  // Navegadores que no emiten onboundary: estimación conservadora, no temporización fonética.
  if((this.boundaries===0 || this.elapsed-this.latestBoundaryAt>1.6) && this.elapsed>.70)this.offset=Math.max(this.offset,Math.min(this.text.length,Math.floor((this.elapsed-.70)*13)));
  if(!this.active && this.next<this.plan.length && this.elapsed-this.lastAt>=2.9){
   const cue=this.plan[this.next];
   if(this.offset>=cue.offset && this.elapsed>=.35){
    this.active={...cue,age:0};this.next++;this.lastAt=this.elapsed;this.lastCue=cue;
   }
  }
  if(!this.active)return empty;
  this.active.age+=dt;
  const p=this.active.age/this.active.duration;
  if(p>=1){this.active=null;return empty;}
  return {...poseAt(this.active.kind,p,this.intensity),kind:this.active.kind,label:this.active.label};
 }
 snapshot(){return {enabled:this.enabled,intensity:this.intensity,started:this.started,planned:this.plan.length,next:this.next,active:this.active?.kind||null,lastCue:this.lastCue?.kind||null,boundaries:this.boundaries,offset:this.offset};}
}
