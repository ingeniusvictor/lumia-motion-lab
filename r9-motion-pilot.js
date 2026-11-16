/**
 * Motion R9-01: R8 -> R9 isolated adapter.
 * Pure motion mathematics: no Qwen/Node bridge, no camera, no STT/TTS service.
 * Driven only by R8's real speech-start / word-boundary / speech-end signals.
 * Manual FBX and dance always win. OFF by default.
 */
import {planSemanticCues} from './semantic-motion.js';
import {inferR9CueFromSpokenPhrase} from './r9/spoken-director.js';
import {R9ExpressiveBlend} from './r9/expressive-blend.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const neutral=()=>({weight:0,head:{pitch:0,yaw:0,roll:0},body:{},kind:null,expression:null});
const maxAngle=Object.freeze({pitch:.075,yaw:.075,roll:.055});
const maxBodyAngle=.09;

export class R9MotionPilot {
  constructor({enabled=false,intensity=80}={}){
    this.enabled=!!enabled;
    this.intensity=clamp(Number(intensity),0,100);
    this.blend=new R9ExpressiveBlend();
    this.clear();
  }
  clear(){
    this.started=false;this.sessionId=null;this.elapsed=0;this.lastBoundaryAt=-Infinity;
    this.offset=0;this.boundaries=0;this.next=0;this.plan=[];
    this.active=null;this.lastStartedAt=-Infinity;this.lastKind=null;
    this.blend.reset();
  }
  setEnabled(v){
    const next=!!v;
    if(next!==this.enabled){this.enabled=next;this.clear();}
    return this.enabled;
  }
  setIntensity(v){this.intensity=clamp(Number(v),0,100);return this.intensity;}
  begin(text,{sessionId=null}={}){
    this.clear();
    if(!this.enabled||typeof text!=='string'||!text.trim())return 0;
    this.sessionId=sessionId;
    this.plan=planSemanticCues(text.slice(0,5000),{maxCues:3}).map((part)=>({
      offset:part.offset,
      cue:inferR9CueFromSpokenPhrase(part.match),
    })).filter((part)=>part.cue&&part.cue.gesture!=='none');
    this.started=true;
    return this.plan.length;
  }
  boundary(index,sessionId=this.sessionId){
    if(!this.started||sessionId!==this.sessionId||!Number.isFinite(index))return false;
    const next=Math.max(0,Math.floor(index));
    if(next<this.offset)return false;
    this.offset=next;this.boundaries++;this.lastBoundaryAt=this.elapsed;
    return true;
  }
  end(sessionId=this.sessionId){
    if(!this.started||sessionId!==this.sessionId)return false;
    this.clear();return true;
  }
  step(dt,{speaking=false,manual=false,dancing=false}={}){
    dt=clamp(dt,0,.05);
    if(!this.enabled||!this.started)return neutral();
    if(!speaking||manual||dancing){
      // Never leave residual rotations over a manual clip or interrupted speech.
      this.blend.reset();this.active=null;
      return neutral();
    }
    this.elapsed+=dt;
    // R8 fallback: use a modest character pace ONLY if browser TTS gives no
    // boundary callback. Never infer a gesture when audio is not playing.
    if((this.boundaries===0||this.elapsed-this.lastBoundaryAt>1.6)&&this.elapsed>.70){
      this.offset=Math.max(this.offset,Math.floor((this.elapsed-.70)*13));
    }
    if(this.active&&this.elapsed>=this.active.expiresAt)this.active=null;
    if(!this.active&&this.next<this.plan.length&&this.elapsed-this.lastStartedAt>=2.4){
      const upcoming=this.plan[this.next];
      if(this.offset>=upcoming.offset&&this.elapsed>=.35){
        this.active={...upcoming,expiresAt:this.elapsed+upcoming.cue.duration_ms/1000};
        this.lastStartedAt=this.elapsed;this.lastKind=upcoming.cue.gesture;this.next++;
      }
    }
    const pose=this.blend.step(dt,this.active?.cue??null);
    if(this.intensity===0)return neutral();
    // Bounded gain makes R9 more legible than R7 without altering FBX tracks.
    const gain=this.intensity/100*1.6;
    const head={
      pitch:clamp(pose.head.pitch*gain,-maxAngle.pitch,maxAngle.pitch),
      yaw:clamp(pose.head.yaw*gain,-maxAngle.yaw,maxAngle.yaw),
      roll:clamp(pose.head.roll*gain,-maxAngle.roll,maxAngle.roll),
    };
    const body=Object.fromEntries(Object.entries(pose.body).map(([name,angle])=>
      [name,clamp(angle*gain,-maxBodyAngle,maxBodyAngle)]));
    return {...pose,head,body};
  }
  snapshot(){return {
    enabled:this.enabled,intensity:this.intensity,speaking:this.started,
    planned:this.plan.length,done:this.next,active:this.active?.cue.gesture??null,
    lastCue:this.lastKind,boundaries:this.boundaries,
  };}
}
