import assert from 'node:assert/strict';
import {SemanticMotionCore,planSemanticCues} from './semantic-motion.js';
const p=planSemanticCues('¡Hola! Es un gusto hablar contigo. Primero podemos revisar el ejemplo. Felicidades, lo conseguimos.');
assert.deepEqual(p.map(c=>c.kind),['greet','explain','celebrate']);
assert.equal(planSemanticCues('Hola, ¿cómo estás?').length,1);
assert.equal(planSemanticCues('No estoy de acuerdo y no es correcto.')[0].kind,'deny');
assert.equal(planSemanticCues('La palabra sino no es una negación.').length,0);
assert.equal(planSemanticCues('').length,0);
assert(planSemanticCues('Primero, segundo, por ejemplo, es decir, hay que...').length<=3);
const m=new SemanticMotionCore({enabled:true,intensity:48});
assert.equal(m.step(.016,{speaking:true}).kind,null,'No se mueve sin voz activa');
assert.equal(m.begin('Sí, claro, estoy de acuerdo. Vamos a revisar el ejemplo.').length,2);
let active=false;
for(let i=0;i<160;i++){
 const result=m.step(.016,{speaking:true});
 if(result.kind){active=true;assert(Math.abs(result.head.pitch)<0.15,'Cabeza limitada a movimientos sutiles');}
}
assert(active,'Debe generar afirmación conservadora');
assert.equal(m.snapshot().lastCue,'affirm');
const before=m.snapshot().lastCue;
assert.equal(m.step(.016,{speaking:true,manual:true}).kind,null);
assert.equal(m.snapshot().lastCue,before);
m.end();assert.equal(m.step(.016,{speaking:true}).kind,null);
m.begin('No puedo hacer eso.');m.setEnabled(false);
for(let i=0;i<100;i++)assert.equal(m.step(.016,{speaking:true}).kind,null);
m.setEnabled(true);m.setIntensity(200);assert.equal(m.intensity,100);
m.begin('Primero revisa el mapa. Después podemos hacer una prueba.');
m.boundary(9);
active=false;for(let i=0;i<140;i++){const v=m.step(.016,{speaking:true});if(v.kind)active=true;}
assert(active);
const interrupted=new SemanticMotionCore();interrupted.begin('¡Felicidades!');
interrupted.step(.016,{speaking:false});assert.equal(interrupted.snapshot().active,null);
console.log('R7 gestos semánticos: pruebas de detección, límites, voz, prioridad manual y cancelación PASS');
