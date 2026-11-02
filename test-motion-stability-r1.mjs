import assert from 'node:assert/strict';
import {MotionIntelligence} from './motion-intelligence.js';
const d=new MotionIntelligence();
assert.equal(d.autoIdleEnabled,true,'Dwarf Idle automático debe estar en Reposo por decisión del usuario');
assert.equal(d.decide({now:0,state:'idle'}),null,'Espera antes de Reposo');
assert.equal(d.decide({now:5,state:'idle'}).id,'idle','Reposo selecciona Dwarf Idle');
assert.equal(d.decide({now:6,state:'listening'})?.id,'listening','Escuchar tiene FBX propio');
assert.equal(d.decide({now:7,state:'thinking'}),null,'No lanzar Thinking inmediatamente');
assert.equal(d.decide({now:7.55,state:'thinking'}),null,'Esperar el tiempo configurable');
let a=d.decide({now:7.70,state:'thinking'});assert.equal(a.id,'thinking');
assert(d.commit(a,7.70));
assert.equal(d.decide({now:8,state:'thinking',activeId:'thinking',active:true}),null,'No reiniciar gesto activo');
assert.equal(d.decide({now:12,state:'thinking',active:false}),null,'No empezar Dwarf Idle tras Thinking');
assert.equal(d.decide({now:12.01,state:'speaking'}),null,'No iniciar Talking en el primer frame');
a=d.decide({now:12.3,state:'speaking'});assert.equal(a.id,'talking');assert(d.commit(a,12.3));
assert.equal(d.decide({now:13,state:'idle'}),null,'Reposo espera antes de recuperar Idle');
// Estado pensar fugaz: el clip de Thinking no se dispara antes de que empiece el audio.
const transient=new MotionIntelligence();
assert.equal(transient.decide({now:0,state:'thinking'}),null);
assert.equal(transient.decide({now:0.22,state:'speaking'}),null);
assert.equal(transient.decide({now:0.48,state:'speaking'}).id,'talking');
// Prueba opt-in de Dwarf Idle: sigue disponible y respeta retardo.
d.setAutoIdleEnabled(true);
assert.equal(d.decide({now:13.3,state:'idle'}),null);
assert.equal(d.decide({now:13.7,state:'idle'}).id,'idle');
d.setAutoIdleEnabled(false);assert.equal(d.decide({now:14,state:'idle'}),null);
d.setThinkingDelay(1.1);assert.equal(d.thinkingDelay,1.1);
console.log('Motion Intelligence R1: reposo estable, debounce y control manual PASS');
