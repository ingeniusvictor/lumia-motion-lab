/** LUMIA v0.7c — deterministic, testable conversation state orchestration. */
const STATES=new Set(['idle','listening','thinking','speaking']);
export class ConversationController {
  constructor(){this.state='idle';this.history=[];this.sequence=0;this.listeners=new Set();}
  subscribe(listener){if(typeof listener!=='function')throw new TypeError('Expected listener');this.listeners.add(listener);listener(this.snapshot(),{type:'initial'});return ()=>this.listeners.delete(listener);}
  snapshot(){return {state:this.state,history:this.history.map(e=>({...e})),sequence:this.sequence};}
  emit(type,detail={}){const data=this.snapshot();for(const listener of this.listeners){listener(data,{type,...detail});}}
  setState(state,source='external'){if(!STATES.has(state))throw new TypeError(`Estado inválido: ${state}`);if(state!==this.state){this.state=state;this.emit('state',{source});}return this.state;}
  startListening(){this.sequence++;this.setState('listening','microphone');}
  stopListening(){if(this.state==='listening')this.setState('idle','microphone');}
  setThinking(){this.setState('thinking','external');}
  setSpeaking(){this.setState('speaking','external');}
  setIdle(){this.setState('idle','external');}
  cancel(){this.sequence++;this.setState('idle','cancel');}
  push(role,text){const msg=String(text??'').trim().slice(0,5000);if(!msg)return null;const item={role,text:msg};this.history.push(item);if(this.history.length>30)this.history.splice(0,this.history.length-30);this.emit('message',{message:item});return item;}
  async submit(input,responder,onAnswer){
    const user=this.push('user',String(input??'').slice(0,1500));
    if(!user)return false;
    const id=++this.sequence;
    this.setState('thinking','submit');
    try{
      const response=await responder({message:user.text,history:this.history.map(x=>({...x}))});
      if(this.sequence!==id)return false; // Ignore obsolete requests after a new user turn/cancel.
      const text=typeof response==='string'?response:response?.reply??response?.text??response?.response;
      if(typeof text!=='string'||!text.trim())throw new Error('La respuesta no contiene texto válido.');
      const assistant=this.push('assistant',text);
      if(typeof onAnswer==='function') await onAnswer(assistant.text,id,response);
      if(this.sequence===id && this.state==='thinking')this.setState('idle','text-only');
      return true;
    }catch(err){
      if(this.sequence!==id)return false;
      this.emit('error',{message:err?.message||String(err)});
      this.setState('idle','error');
      return false;
    }
  }
  receiveAnswer(text){const assistant=this.push('assistant',text);if(assistant){this.setState('thinking','response-received');}return assistant;}
}
