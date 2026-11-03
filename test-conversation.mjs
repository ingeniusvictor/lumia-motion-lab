import assert from 'node:assert/strict';
import {ConversationController} from './conversation-core.js';

const c=new ConversationController();
const states=[];
const events=[];
c.subscribe((snap,event)=>{states.push(snap.state);events.push(event.type);});
assert.equal(c.state,'idle');
c.startListening();assert.equal(c.state,'listening');
c.stopListening();assert.equal(c.state,'idle');
let makeResolve;
const future=new Promise(resolve=>{makeResolve=resolve;});
const pending=c.submit('Primera pregunta',()=>future,()=>c.setSpeaking());
assert.equal(c.state,'thinking');
// New request supersedes old response (no stale speech or output).
const newPromise=c.submit('Segunda pregunta',async()=>({reply:'Respuesta nueva'}),()=>c.setSpeaking());
assert.equal(await newPromise,true);assert.equal(c.state,'speaking');
makeResolve('Respuesta obsoleta');assert.equal(await pending,false);
assert.deepEqual(c.history.map(x=>x.text),['Primera pregunta','Segunda pregunta','Respuesta nueva']);
c.setIdle();assert.equal(c.state,'idle');
// Cancel request suppresses late reply and returns to idle.
let resolveCancel;
const cancelFuture=new Promise(resolve=>{resolveCancel=resolve;});
const p2=c.submit('Tercera',()=>cancelFuture,()=>c.setSpeaking());
assert.equal(c.state,'thinking');
c.cancel();assert.equal(c.state,'idle');
resolveCancel('No debe mostrarse');assert.equal(await p2,false);
assert.ok(!c.history.find(x=>x.text==='No debe mostrarse'));
// Error response generates an event and returns to idle.
assert.equal(await c.submit('Error controlado',async()=>{throw new Error('sin backend');}),false);
assert.equal(c.state,'idle');assert.ok(events.includes('error'));
// Text-only responder returns idle without speaking.
assert.equal(await c.submit('Solo texto',async()=>({reply:'Solo texto de vuelta'})),true);
assert.equal(c.state,'idle');
// Explicit external event lifecycle.
c.startListening();c.setThinking();c.setSpeaking();c.setIdle();
assert.deepEqual(states.slice(-4),['listening','thinking','speaking','idle']);
console.log(JSON.stringify({PASS:true,eventsRecorded:events.length,historyCount:c.history.length,finalState:c.state,automaticTransitions:['listening','thinking','speaking','idle'],obsoleteResponseSuppressed:true,cancelWorks:true},null,2));
