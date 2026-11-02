/** LUMIA v0.8 · conversación, expresiones y visemas.
 * Sin claves ni conexión implícita al motor original. La página es demo hasta enlazar setResponder o API.
 */
import {ConversationController} from './conversation-core.js';
import {TextVisemeTimeline,TimedVisemeTimeline,energyEnvelope} from './viseme-core.js';
import {analyzeEmotion} from './emotion-core.js';
import {SpeechSession} from './speech-session.js';

const $=s=>document.querySelector(s);
const controller=new ConversationController();
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
const ttsSupported='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
const MAX_INPUT=1500;
const displayName={idle:'En reposo',listening:'Escuchando',thinking:'Pensando',speaking:'Hablando'};
const words=new TextVisemeTimeline(),marks=new TimedVisemeTimeline();
let recognition=null,voiceToken=0,activeSpeech=null,nativeResponder=null;
let externalAudio=null,externalAudioHandlers=null,objectUrl=null;
let audioContext=null,audioAnalyser=null,audioSource=null,audioData=null,energy=0;
let emotionCue={emotion:'neutral',intensity:0,source:'neutral'};
let emotionEndsAt=0;
let locale='es-CL';
const speechSession=new SpeechSession();
let lastAudioText='';
function emitVoiceEvent(phase,details={}){
  let event=null;
  if(phase==='start')event=speechSession.begin(details);
  else if(phase==='boundary')event=speechSession.boundary(details.index,details.sessionId);
  else if(phase==='end')event=speechSession.end(details.sessionId,details.reason||'ended');
  if(event)window.dispatchEvent(new CustomEvent('lumia:speech-motion',{detail:event}));
  return event;
}


function demoResponder({message}){
 const t=message.toLocaleLowerCase('es');
 if(/\b(hola|buenas|saludos)\b/.test(t))return {reply:'¡Hola! Me alegra verte. Ahora puedo coordinar mis gestos y la boca con las palabras que pronuncio.',emotion:'happy',intensity:.58};
 if(/(c[oó]mo est[aá]s|qu[eé] tal)/.test(t))return {reply:'Estoy muy bien, gracias. ¡Es maravilloso aprender a expresarme mejor!',emotion:'happy',intensity:.66};
 if(/(qu[eé] puedes|funciones|capacidad)/.test(t))return {reply:'Puedo escuchar, pensar, responder con voz y mostrar expresiones. ¡También puedes probar mis nuevas vocales!',emotion:'curious',intensity:.55};
 if(/(triste|pena|preocupad|dolor)/.test(t))return {reply:'Lamento que te sientas así. Podemos conversar con calma y buscar una solución.',emotion:'sad',intensity:.45};
 if(/(sorpresa|sorpr[eé]ndeme)/.test(t))return {reply:'¡Vaya, qué sorpresa! Estoy aprendiendo a reaccionar con movimientos y expresiones más naturales.',emotion:'surprised',intensity:.60};
 if(/(clima|noticias|precio|temperatura)/.test(t))return {reply:'No tengo datos actuales en este modo de demostración. Para eso hay que conectar el motor real de Lumia.',emotion:'neutral'};
 return {reply:'Entendí tu mensaje: '+message.slice(0,140)+'. Esta es una demostración local. Cuando conectemos mi motor real, podré responder con más inteligencia.',emotion:'relaxed',intensity:.36};
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function demo(args){await delay(450);return demoResponder(args);}
async function callAPI(args){
 const url=new URL('/api/lumia/chat',location.href);
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),20000);
 try{
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(args),signal:abort.signal});
  if(!res.ok)throw new Error('API HTTP '+res.status+'. Comprueba que tu backend real sirve /api/lumia/chat.');
  const data=await res.json();
  if(typeof data==='string')return data;
  if(typeof data?.reply!=='string'&&typeof data?.text!=='string'&&typeof data?.response!=='string')throw new Error('La API debe responder con {reply:"..."}.');
  return data;
 }finally{clearTimeout(timer);}
}
function responder(args){return nativeResponder?nativeResponder(args):$('#backend-mode').value==='api'?callAPI(args):demo(args);}
function setMessage(s){$('#conversation-status').textContent=s;}
function appendChat(message){
 const list=$('#conversation-history');
 const div=document.createElement('div');div.className='chat-bubble '+(message.role==='user'?'chat-user':'chat-assistant');
 const head=document.createElement('strong');head.textContent=message.role==='user'?'Tú':'Lumia';
 const body=document.createElement('div');body.textContent=message.text;
 div.append(head,body);list.appendChild(div);list.scrollTop=list.scrollHeight;
 while(list.children.length>30)list.firstChild.remove();
}
function showEmotionStatus(){
 const names={neutral:'Neutral',happy:'Alegría',sad:'Empatía/tristeza',angry:'Enfado',surprised:'Sorpresa',relaxed:'Calma',curious:'Curiosidad'};
 $('#auto-emotion-state').textContent=`Expresión sugerida: ${names[emotionCue.emotion]||emotionCue.emotion} · ${emotionCue.source}`;
}
function chooseEmotion(text,meta={}){
 emotionCue=analyzeEmotion(text,meta?.emotion,meta?.intensity);
 emotionEndsAt=Infinity;
 showEmotionStatus();
 window.dispatchEvent(new CustomEvent('lumia:emotion',{detail:{...emotionCue}}));
}
function getEmotionCue(){
 if(!$('#auto-emotion').checked)return {emotion:'neutral',intensity:0};
 if(performance.now()>emotionEndsAt)return {emotion:'neutral',intensity:0};
 return emotionCue;
}
function expireEmotion(ms=900){emotionEndsAt=performance.now()+ms;}
function cancelSpeech(){
 emitVoiceEvent('end',{reason:'interrupted'});
 ++voiceToken;
 if(ttsSupported)window.speechSynthesis.cancel();
 activeSpeech=null;words.stop();marks.stop();energy=0;
 if(externalAudio&&!externalAudio.paused)externalAudio.pause();
}
function selectVoice(){
 const voices=window.speechSynthesis.getVoices();
 return voices.find(v=>v.lang?.toLowerCase()==='es-cl')||voices.find(v=>v.lang?.toLowerCase().startsWith('es-'))||null;
}
function stopAll(){
 try{recognition?.abort();}catch{}
 cancelSpeech();controller.cancel();expireEmotion(200);
 setMessage('Conversación detenida.');
}
function speakText(text){
 if(!ttsSupported){controller.setIdle();setMessage('Voz no disponible en este navegador.');expireEmotion(200);return;}
 cancelSpeech();const token=voiceToken;
 const utterance=new SpeechSynthesisUtterance(text);
 utterance.lang=locale;utterance.rate=1;utterance.pitch=1.08;utterance.volume=1;
 const voice=selectVoice();if(voice)utterance.voice=voice;
 activeSpeech={text,started:false,token,utterance};
 const watch=setTimeout(()=>{
  if(token===voiceToken&&activeSpeech&&!activeSpeech.started){cancelSpeech();controller.setIdle();expireEmotion();setMessage('La voz no inició. La respuesta permanece en el chat.');}
 },5000);
 utterance.onstart=()=>{
  if(token!==voiceToken)return;
  clearTimeout(watch);activeSpeech.started=true;
  words.start(text,performance.now());
  controller.setSpeaking();setMessage('Lumia está hablando · visemas estimados por palabras.');
  emitVoiceEvent('start',{source:'browser-tts',text});
 };
 utterance.onboundary=e=>{
  if(token!==voiceToken||!activeSpeech?.started)return;
  if(Number.isFinite(e.charIndex)){words.boundary(e.charIndex,performance.now());emitVoiceEvent('boundary',{index:e.charIndex});}
 };
 utterance.onend=()=>{
  clearTimeout(watch);if(token!==voiceToken)return;
  emitVoiceEvent('end',{reason:'ended'});
  activeSpeech=null;words.stop();controller.setIdle();expireEmotion();setMessage('Respuesta terminada.');
 };
 utterance.onerror=e=>{
  clearTimeout(watch);if(token!==voiceToken)return;
  emitVoiceEvent('end',{reason:'ended'});
  activeSpeech=null;words.stop();controller.setIdle();expireEmotion();setMessage('Error de voz: '+(e.error||'desconocido'));
 };
 window.speechSynthesis.speak(utterance);
}
function applyResponseMetadata(response,text){
 const meta=typeof response==='object'&&response?response:{};
 chooseEmotion(text,meta);
 // Cues de TTS reales: el motor debe indicar marcas del audio que vaya a reproducir.
 if(Array.isArray(meta.visemes)){
  try{marks.load(meta.visemes);}catch(e){setMessage('Marcas de visemas inválidas: '+e.message);}
 }
}
function deliverResponse(response,options={}){
 const text=typeof response==='string'?response:response?.reply??response?.text??response?.response;
 if(typeof text!=='string'||!text.trim())return false;
 const msg=controller.receiveAnswer(text);
 if(!msg)return false;
 applyResponseMetadata(response,msg.text);
 if(options.speak??$('#speak-replies').checked)speakText(msg.text);
 else if(!options.keepState){controller.setIdle();expireEmotion(1600);}
 return true;
}
async function sendMessage(raw){
 const message=String(raw??'').trim().slice(0,MAX_INPUT);
 if(!message)return false;
 cancelSpeech();expireEmotion(0);
 $('#chat-input').value='';
 return controller.submit(message,responder,async (answer,id,rawReply)=>{
  applyResponseMetadata(rawReply,answer);
  if($('#speak-replies').checked)speakText(answer);
  else{controller.setIdle();expireEmotion(1600);}
 });
}
function microphone(){
 if(!SpeechRecognition)throw new Error('Reconocimiento no disponible. Prueba Chrome/Edge o escribe el mensaje.');
 if(!recognition){
  recognition=new SpeechRecognition();recognition.lang=locale;recognition.continuous=false;recognition.interimResults=true;
  recognition.onstart=()=>{controller.startListening();setMessage('Escuchando…');};
  recognition.onresult=e=>{
   if(recognition.__lumiaSubmitted)return;
   let finalText='',interimText='';
   for(let i=e.resultIndex;i<e.results.length;i++){
    const segment=e.results[i][0]?.transcript||'';
    if(e.results[i].isFinal)finalText+=segment;else interimText+=segment;
   }
   if(interimText)setMessage('Escuchando: '+interimText.slice(0,180));
   if(finalText.trim()){
    recognition.__lumiaSubmitted=true;
    try{recognition.stop();}catch{}
    sendMessage(finalText);
   }
  };
  recognition.onend=()=>{if(controller.state==='listening'){controller.stopListening();setMessage('Micrófono detenido.');}};
  recognition.onerror=e=>{controller.stopListening();setMessage('Error de reconocimiento: '+(e.error||'desconocido'));};
 }
 return recognition;
}
function startListening(){
 stopAll();
 try{const mic=microphone();mic.__lumiaSubmitted=false;mic.start();setMessage('Solicitando micrófono…');return true;}
 catch(e){setMessage(e.message||String(e));return false;}
}
function configureAudioAnalysis(audio){
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return false;
  if(!audioContext)audioContext=new AudioCtx();
  const source=audioContext.createMediaElementSource(audio);
  const analyser=audioContext.createAnalyser();analyser.fftSize=1024;
  source.connect(analyser);analyser.connect(audioContext.destination);
  audioSource=source;audioAnalyser=analyser;audioData=new Uint8Array(analyser.fftSize);
  return true;
 }catch(e){console.warn('Audio RMS no disponible:',e);return false;}
}
function attachAudioElement(element){
 if(externalAudio&&externalAudioHandlers){
  for(const [event,fn] of externalAudioHandlers)externalAudio.removeEventListener(event,fn);
 }
 externalAudio=element||null;externalAudioHandlers=null;
 if(!element)return false;
 const start=()=>{
  emitVoiceEvent('end',{reason:'audio-takes-priority'});
  ++voiceToken; if(ttsSupported)window.speechSynthesis.cancel();
  words.stop();activeSpeech=null;
  if(marks.marks.length)marks.start(performance.now()-(element.currentTime||0)*1000);
  controller.setSpeaking();emitVoiceEvent('start',{source:'external-audio',text:lastAudioText});setMessage('Reproduciendo audio externo · amplitud de voz medida.');
  audioContext?.resume?.().catch(()=>{});
 };
 const stop=()=>{emitVoiceEvent('end',{reason:'audio-ended'});if(controller.state==='speaking'){controller.setIdle();expireEmotion();}marks.stop();energy=0;};
 externalAudioHandlers=[['playing',start],['ended',stop],['pause',stop]];
 for(const [event,fn] of externalAudioHandlers)element.addEventListener(event,fn);
 configureAudioAnalysis(element);
 return true;
}
function getVisemeCue(){
 if(controller.state!=='speaking')return null;
 const now=performance.now();
 if(externalAudio&&!externalAudio.paused){
  if(marks.active){
   const cue=marks.cue(marks.beginMs+(externalAudio.currentTime||0)*1000);
   if(cue)return cue;
  }
  if(audioAnalyser&&audioData){
   audioAnalyser.getByteTimeDomainData(audioData);
   const raw=energyEnvelope(audioData);
   energy=energy*.58+raw*.42;
   const amount=Math.min(.72,Math.max(0,(energy-.008)*4.0));
   return {vowel:amount>.05?'aa':null,amount,source:'amplitud-real-audio'};
  }
  return {vowel:'aa',amount:.26,source:'audio-sin-medidor'};
 }
 if(activeSpeech?.started)return words.cue(now)||{vowel:null,amount:0,source:'pausa-voz'};
 return {vowel:null,amount:0,source:'sin-voz'};
}
controller.subscribe((snapshot,event)=>{
 if(event.type==='message'&&event.message)appendChat(event.message);
 if(event.type==='error')setMessage('Error de conversación: '+event.message);
 const state=snapshot.state;
 $('#conversation-mode').textContent=displayName[state]||state;
 $('#microphone').classList.toggle('active',state==='listening');
 $('#conversation-status').dataset.state=state;
 window.dispatchEvent(new CustomEvent('lumia:conversation-state',{detail:{state,event:event.type}}));
});
$('#send-chat').addEventListener('click',()=>sendMessage($('#chat-input').value));
$('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage($('#chat-input').value);}});
$('#microphone').addEventListener('click',()=>{if(controller.state==='listening'){try{recognition?.stop();}catch{}controller.stopListening();}else startListening();});
$('#stop-conversation').addEventListener('click',stopAll);
$('#speak-replies').disabled=!ttsSupported;
if(!SpeechRecognition)$('#microphone').title='Este navegador no permite reconocimiento de voz Web Speech';
$('#backend-mode').addEventListener('change',()=>setMessage($('#backend-mode').value==='demo'?'Demostración local sin IA.':'API: debes proporcionar /api/lumia/chat en el mismo origen.'));
$('#auto-emotion').addEventListener('change',showEmotionStatus);
$('#audio-file').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.type.startsWith('audio/')){setMessage('Selecciona un archivo de audio válido.');return;}
 if(file.size>50*1024*1024){setMessage('El archivo supera los 50 MB de la prueba.');return;}
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(file);
 const player=$('#sample-audio');player.src=objectUrl;player.hidden=false;
 if(externalAudio!==player)attachAudioElement(player);
 setMessage('Audio local cargado. Pulsa Play para animar la boca por amplitud sonora.');
});
showEmotionStatus();setMessage('Demostración local. La IA original necesita conexión mediante bridge o API.');

// A remote TTS must explicitly identify the beginning and end of its audio.
// It must not report `speaking` until audio playback really begins.
function beginExternalSpeech({text='',emotion=null,intensity=.5,visemes=null}={}){
  if(ttsSupported)window.speechSynthesis.cancel();
  ++voiceToken;activeSpeech=null;words.stop();
  emitVoiceEvent('end',{reason:'superseded'});
  if(emotion)chooseEmotion(String(text??''),{emotion,intensity});
  if(Array.isArray(visemes))marks.load(visemes);
  controller.setSpeaking();
  setMessage('Voz externa en reproducción · movimientos sincronizados por eventos.');
  return emitVoiceEvent('start',{source:'external-tts',text:String(text??'')})?.id??null;
}
function endExternalSpeech(sessionId){
  const ended=emitVoiceEvent('end',{sessionId,reason:'external-ended'});
  if(!ended)return false;
  if(controller.state==='speaking')controller.setIdle();
  expireEmotion();return true;
}
const bridge=Object.freeze({
 setResponder(fn){if(fn!==null&&typeof fn!=='function')throw new TypeError('Se requiere una función o null.');nativeResponder=fn;setMessage(fn?'Motor conversacional externo conectado.':'Motor externo desconectado.');},
 sendText:sendMessage,startListening,stopListening(){try{recognition?.stop();}catch{}controller.stopListening();},
 startThinking(){emitVoiceEvent('end',{reason:'new-thinking'});controller.setThinking();},
 startSpeaking(){controller.setSpeaking();},
 finishSpeaking(){emitVoiceEvent('end',{reason:'external-finished'});controller.setIdle();expireEmotion();},
 returnToIdle(){emitVoiceEvent('end',{reason:'idle'});controller.setIdle();expireEmotion();},
 deliverResponse,attachAudioElement,
 setEmotion(emotion,intensity=.5){emotionCue=analyzeEmotion('',emotion,intensity);emotionEndsAt=Infinity;showEmotionStatus();},
 setTimedVisemes(cues){return marks.load(cues);},
 // Motor de voz externo: enviar texto al empezar y posición de palabra durante el audio.
 // Compatibilidad con R7: los 3 métodos ahora manejan la sesión de voz externa.
 semanticSpeechStart(text){return beginExternalSpeech({text});},
 semanticSpeechBoundary(index,sessionId){return !!emitVoiceEvent('boundary',{index,sessionId});},
 semanticSpeechEnd(sessionId){return endExternalSpeech(sessionId);},
 beginExternalSpeech,
 externalSpeechBoundary(index,sessionId){return !!emitVoiceEvent('boundary',{index,sessionId});},
 endExternalSpeech,
 setExternalAudioText(text){lastAudioText=String(text??'');return lastAudioText.length;},
 getSpeechSession(){return speechSession.snapshot;},
 interruptAndListen(){stopAll();controller.startListening();return controller.state;},
 stop:stopAll,getState(){return controller.state;},subscribe:fn=>controller.subscribe(fn),
 getVisemeCue,getEmotionCue,
});
window.LUMIAConversation=bridge;
window.addEventListener('message',ev=>{
 if(ev.origin!==location.origin||!ev.data||ev.data.channel!=='lumia-conversation-v1')return;
 const {event,text,emotion,intensity,visemes}=ev.data;
 if(event==='listening'){cancelSpeech();controller.startListening();}
 else if(event==='thinking'){emitVoiceEvent('end',{reason:'new-thinking'});controller.setThinking();}
 else if(event==='speaking')controller.setSpeaking();
 else if(event==='idle'){emitVoiceEvent('end',{reason:'idle'});controller.setIdle();expireEmotion();}
 else if(event==='transcript')sendMessage(text);
 else if(event==='response')deliverResponse({reply:text,emotion,intensity,visemes},{speak:false});
 else if(event==='emotion')bridge.setEmotion(emotion,intensity);
 else if(event==='visemes'&&Array.isArray(visemes)){try{bridge.setTimedVisemes(visemes);}catch(e){setMessage(e.message);}}
 else if(event==='speech-start')beginExternalSpeech({text,emotion,intensity,visemes});
 else if(event==='speech-boundary')bridge.externalSpeechBoundary(ev.data.index,ev.data.sessionId);
 else if(event==='speech-end')bridge.endExternalSpeech(ev.data.sessionId);
 else if(event==='interrupt')bridge.interruptAndListen();
 else if(event==='stop')stopAll();
});
export {controller,bridge,getVisemeCue,getEmotionCue};
