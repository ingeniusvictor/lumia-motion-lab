import assert from 'node:assert/strict';
import {SpeechSession} from './speech-session.js';
import {PoseTransition} from './pose-transition.js';
import {MotionIntelligence} from './motion-intelligence.js';
import {SemanticMotionCore} from './semantic-motion.js';

const session=new SpeechSession();
assert.equal(session.end(),null);
const first=session.begin({source:'external-tts',text:'Sí, claro, vamos a empezar.'});
assert.equal(first.id,1);
assert.equal(session.boundary(3,first.id).index,3);
assert.equal(session.boundary(1,first.id),null,'La posición de audio no debe retroceder');
assert.equal(session.boundary(500,first.id).index,first.text.length);
const interrupted=session.end(first.id,'interrupted');
assert.equal(interrupted.reason,'interrupted');
const second=session.begin({source:'external-tts',text:'Respuesta nueva'});
assert(second.id>first.id);
assert.equal(session.end(first.id),null,'Un evento atrasado no debe cerrar la respuesta nueva');
assert.equal(session.boundary(5,first.id),null,'Una palabra atrasada no debe reanimar la voz anterior');
assert.equal(session.active.id,second.id);
assert.equal(session.end(second.id).phase,'end');
assert.equal(session.end(second.id),null,'El final repetido no debe generar eventos');

// Quaternion mock: slerpQuaternions is enough to verify a smooth, bounded bridge.
class FakeQuat {constructor(x){this.x=x;}clone(){return new FakeQuat(this.x);}slerpQuaternions(a,b,t){this.x=a.x*(1-t)+b.x*t;return this;}}
const n={quaternion:new FakeQuat(0)}, bridge=new PoseTransition(.4);
assert.equal(bridge.capture([n]),1);n.quaternion.x=1;
bridge.step(.1);assert(n.quaternion.x>0&&n.quaternion.x<1);
n.quaternion.x=1;bridge.step(.1);assert(n.quaternion.x>0&&n.quaternion.x<1);
n.quaternion.x=1;bridge.step(.2);assert.equal(bridge.active,false);assert.equal(n.quaternion.x,1);
bridge.capture([n]);bridge.clear();assert.equal(bridge.active,false);

// Prevent reinstating the old Talking interruption by default.
const director=new MotionIntelligence();
director.observe('speaking',0);
const firstTalk=director.decide({now:.6,state:'speaking',active:false});
assert.equal(firstTalk.id,'talking');director.commit(firstTalk,.6);
for(let n=2;n<30;n++) assert.equal(director.decide({now:n,state:'speaking',active:true,activeId:'talking',emotion:{emotion:'happy',intensity:1}}),null);
const semantic=new SemanticMotionCore();semantic.begin('Sí, claro. Primero revisemos un ejemplo.');
let seen=false;for(let i=0;i<180;i++){if(semantic.step(.016,{speaking:true}).kind)seen=true;}
assert(seen,'La capa semántica no se pierde durante Talking');
console.log('R8 PASS · sesiones de voz, eventos obsoletos, interpolación de pose, Talking continuo y gestos aditivos');
