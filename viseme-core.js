/** LUMIA v0.8 · articulación estimada a partir de texto y eventos de Web Speech.
 * Los eventos Web Speech `boundary` marcan palabras, NO fonemas.
 * Para sincronía fonética real usar setTimedVisemes con marcas del TTS real.
 * Módulo puro: se puede probar en Node sin navegador ni Three.js.
 */
const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const VOWELS={a:'aa','á':'aa',e:'ee','é':'ee',i:'ih','í':'ih',y:'ih',o:'oh','ó':'oh',u:'ou','ú':'ou','ü':'ou'};
const norm=ch=>String(ch||'').toLocaleLowerCase('es-CL');
const isVowel=ch=>Object.prototype.hasOwnProperty.call(VOWELS,norm(ch));

export function classifyGrapheme(ch){
 const char=norm(ch);
 if(VOWELS[char])return {vowel:VOWELS[char],amount:.66};
 if(/[mbp]/.test(char))return {vowel:null,amount:0}; // cierre bilabial
 if(/[fv]/.test(char))return {vowel:'ee',amount:.12};
 if(/[rlñnlsdtcgjkqxzh]/.test(char))return {vowel:'aa',amount:.20};
 return {vowel:null,amount:0};
}
export function textWords(text){
 const words=[];
 for(const match of String(text||'').matchAll(/[\p{L}]+(?:['’\-][\p{L}]+)*/gu)){
  words.push({start:match.index,end:match.index+match[0].length,text:match[0]});
 }
 return words;
}
export class TextVisemeTimeline{
 constructor(){this.reset();}
 reset(){this.text='';this.words=[];this.speechStart=0;this.wordIndex=-1;this.lastBoundaryMs=0;this.observedMsPerChar=82;this.haveBoundary=false;this.active=false;}
 start(text,nowMs=0){this.reset();this.text=String(text||'').slice(0,6000);this.words=textWords(this.text);this.speechStart=nowMs;this.active=true;}
 boundary(charIndex,nowMs=0){
  if(!this.active||!Number.isFinite(charIndex)||!this.words.length)return;
  const index=clamp(Math.floor(charIndex),0,this.text.length);
  let found=this.words.findIndex(w=>index>=w.start&&index<w.end);
  if(found<0)found=this.words.findIndex(w=>w.start>=index);
  if(found<0)return;
  if(this.haveBoundary && found>this.wordIndex && this.wordIndex>=0){
   const delta=Math.max(1,nowMs-this.lastBoundaryMs);
   let charCount=0;
   for(let i=this.wordIndex;i<found;i++)charCount+=this.words[i].text.length+1;
   if(charCount){
    const observed=clamp(delta/charCount,42,175);
    this.observedMsPerChar=.7*this.observedMsPerChar+.3*observed;
   }
  }
  this.wordIndex=found;this.lastBoundaryMs=nowMs;this.haveBoundary=true;
 }
 cue(nowMs=0){
  if(!this.active||!this.words.length)return null;
  const elapsed=Math.max(0,nowMs-(this.haveBoundary?this.lastBoundaryMs:this.speechStart));
  let word;
  let offset;
  let speed=this.observedMsPerChar;
  if(this.haveBoundary){
   word=this.words[this.wordIndex];
   if(!word)return null;
   offset=elapsed/speed;
  }else{
   // Fallback para voces que no generan eventos onboundary.
   let pos=elapsed/speed;
   for(const item of this.words){
    if(pos<=item.text.length+1){word=item;offset=pos;break;}
    pos-=item.text.length+1;
   }
   if(!word)return {vowel:null,amount:0,source:'texto-estimado'};
  }
  if(offset>=word.text.length+0.7)return {vowel:null,amount:0,source:'pausa-entre-palabras'};
  const char=word.text[Math.min(word.text.length-1,Math.floor(offset))];
  let result=classifyGrapheme(char);
  // Pronunciación audiovisual aproximada, sin inventar que se conoce el fonema real.
  // La amplitud se reduce cerca del final de cada palabra.
  const endFactor=offset>word.text.length-0.75?.72:1;
  return {...result,amount:result.amount*endFactor,source:this.haveBoundary?'palabra-webspeech':'texto-estimado',char,word:word.text};
 }
 stop(){this.active=false;}
}
const VISEMES=new Set(['aa','ee','ih','oh','ou','sil']);
export function validateVisemeMarks(marks){
 if(!Array.isArray(marks)||marks.length>20000)throw new TypeError('Las marcas deben ser una lista de máximo 20000 elementos.');
 let prior=-1;
 return marks.map(item=>{
  if(!item||!Number.isFinite(item.timeMs)||item.timeMs<0||item.timeMs<prior)throw new TypeError('Tiempos timeMs inválidos o desordenados.');
  const vowel=String(item.viseme||item.vowel||'sil').toLowerCase();
  if(!VISEMES.has(vowel))throw new TypeError('Visema desconocido: '+vowel);
  const amount=clamp(Number(item.amount??item.weight??.65),0,1);
  prior=item.timeMs;
  return {timeMs:item.timeMs,vowel:vowel==='sil'?null:vowel,amount};
 });
}
export class TimedVisemeTimeline{
 constructor(){this.clear();}
 clear(){this.marks=[];this.active=false;this.beginMs=0;}
 load(marks){this.marks=validateVisemeMarks(marks);this.active=false;return this.marks.length;}
 start(nowMs){this.beginMs=nowMs;this.active=true;}
 stop(){this.active=false;}
 cue(nowMs){
  if(!this.active||!this.marks.length)return null;
  const t=Math.max(0,nowMs-this.beginMs);
  let lo=0,hi=this.marks.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(this.marks[mid].timeMs<=t)lo=mid;else hi=mid-1;}
  const mark=this.marks[lo];
  if(mark.timeMs>t||t-mark.timeMs>450)return {vowel:null,amount:0,source:'marcas-tts'};
  return {vowel:mark.vowel,amount:mark.amount,source:'marcas-tts'};
 }
}
export function energyEnvelope(samples){
 if(!samples?.length)return 0;
 let sum=0;
 for(const v of samples){const x=(v-128)/128;sum+=x*x;}
 return clamp(Math.sqrt(sum/samples.length),0,1);
}
