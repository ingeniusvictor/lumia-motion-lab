/** LUMIA v0.8 · sugerencias de expresión por reglas transparentes, no inferencia emocional clínica. */
const VALID=new Set(['neutral','happy','sad','angry','surprised','relaxed','curious']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const patterns={
 sad:[/\b(lamento|lamentamos|siento mucho|lo siento|triste|tristeza|falleci[oó]|p[eé]rdida|doloroso|preocupante)\b/iu],
 angry:[/\b(enojad[oa]|indignante|injusticia|frustrante|molest[oa]|indignaci[oó]n)\b/iu],
 happy:[/\b(felicidades|enhorabuena|excelente|genial|fant[aá]stico|maravilloso|me alegra|qu[eé] bueno|celebramos|bravo)\b/iu],
 surprised:[/\b(incre[ií]ble|sorpresa|sorprendente|no me lo esperaba|vaya)\b/iu],
 curious:[/\b(interesante|exploremos|investiguemos|cu[eé]ntame|veamos por qu[eé]|podr[ií]amos probar|qu[eé] ocurrir[ií]a)\b/iu],
 relaxed:[/\b(tranquil[oa]|con calma|sin prisa|descansa|rel[aá]jate|estoy aqu[ií]|todo bien)\b/iu],
};
export function analyzeEmotion(text, explicitEmotion=null, explicitIntensity=null){
 const plain=String(text||'').slice(0,6000);
 const tag=String(explicitEmotion||'').trim().toLowerCase();
 if(VALID.has(tag))return {emotion:tag,intensity:clamp((explicitIntensity!==null&&explicitIntensity!==undefined&&Number.isFinite(+explicitIntensity))?+explicitIntensity:.64,0,.85),source:'motor-externo'};
 // Primero se evalúa empatía/situación delicada; nunca se vuelve 'Extra' automáticamente.
 for(const [emotion,regexes] of Object.entries(patterns)){
  if(regexes.some(pattern=>pattern.test(plain))){
   return {emotion,intensity:emotion==='angry'?.32:emotion==='sad'?.44:.50,source:'reglas-de-texto'};
  }
 }
 if(/[¡!]{1,}/.test(plain) && !/\b(no|nunca|error|fall[oó])\b/iu.test(plain))return {emotion:'happy',intensity:.34,source:'puntuaci[oó]n'};
 return {emotion:'neutral',intensity:0,source:'neutral'};
}
export const AVAILABLE_EMOTIONS=[...VALID];
