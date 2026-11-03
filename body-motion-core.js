/**
 * LUMIA Body Motion v0.8.2 - multi-axis procedural animation.
 * Anatomically bounded animated rotations on existing VRM humanoid bones.
 * Original avatar, facial rig and conversation modules remain unchanged.
 * Outputs local Euler offsets in radians; viewer composes them with rest quaternions.
 */
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,dt,rate)=>a+(b-a)*(1-Math.exp(-rate*dt));
const DEG=Math.PI/180;
const poses={
 natural:{arm:73,elbow:-12,upperY:5,lowerY:15,shoulder:1.0,handZ:2},
 formal:{arm:80,elbow:-8,upperY:2,lowerY:9,shoulder:.25,handZ:0},
 open:{arm:50,elbow:-15,upperY:8,lowerY:24,shoulder:1.6,handZ:5},
 tpose:{arm:0,elbow:0,upperY:0,lowerY:0,shoulder:0,handZ:0},
};
const behaviors=new Set(['idle','listening','thinking','speaking']);
const gestureDurations={wave:3.1,explain:4.3,point:2.9,welcome:3.7};
// Angular budgets in degrees. Deliberately smaller than a full joint anatomical range.
const bounds={
 upperZ:83,upperY:30,upperX:16,lowerZ:88,lowerY:54,lowerX:17,
 shoulderZ:8,shoulderY:12,shoulderX:8,handZ:24,handY:22,handX:25,
 chestX:3.5,chestY:3.5,chestZ:2.0,
 spineX:2.5,spineY:2.5,spineZ:2.5,hipsZ:2.5,
};
export class BodyMotionCore {
 constructor(){
   this.elapsed=0;this.angle=Object.create(null);
   this.gestureName=null;this.gestureTime=0;
   this.waveActive=false;this.explainActive=false;
 }
 requestGesture(name){if(!gestureDurations[name])return false;
   this.gestureName=name;this.gestureTime=0;
   this.waveActive=name==='wave';this.explainActive=name==='explain';return true;}
 requestWave(){return this.requestGesture('wave');}
 requestExplain(){return this.requestGesture('explain');}
 requestPoint(){return this.requestGesture('point');}
 requestWelcome(){return this.requestGesture('welcome');}
 clearGestures(){this.gestureName=null;this.gestureTime=0;this.waveActive=false;this.explainActive=false;}
 step(dt,cfg={}){
   dt=clamp(Number.isFinite(dt)?dt:0,0,.05);this.elapsed+=dt;
   const t=this.elapsed;
   const behavior=behaviors.has(cfg.behavior)?cfg.behavior:'idle';
   const pose=poses[cfg.bodyPose]||poses.natural;
   const tpose=cfg.bodyPose==='tpose';
   const live=cfg.live!==false && cfg.bodyMotion!==false;
   const dynamic=live&&!tpose;
   const intensity=clamp(cfg.bodyIntensity??.60,0,1);
   const speed=clamp(cfg.bodySpeed??5,1.5,12);
   const depth=clamp(cfg.bodyDepth??.75,0,1.3);
   const wrist=clamp(cfg.bodyWrist??.75,0,1.3);
   const depthSign=cfg.bodyDepthSign===-1?-1:1;
   const talk=dynamic&&behavior==='speaking'?intensity:0;
   const listen=dynamic&&behavior==='listening'?intensity:0;
   const think=dynamic&&behavior==='thinking'?intensity:0;

   let gestureStrength=0;
   if(this.gestureName){
      this.gestureTime+=dt;
      const duration=gestureDurations[this.gestureName];
      const p=clamp(this.gestureTime/duration,0,1);
      gestureStrength=Math.sin(Math.PI*p)**2;
      if(p>=1){this.clearGestures();}
   }
   if(!dynamic)gestureStrength=0;

   // Two sides have offset phases, avoiding perfectly mirrored robotic motion.
   const leftTalk=Math.sin(t*2.1+0.40)*talk;
   const rightTalk=Math.sin(t*2.65+1.15)*talk;
   const breath=dynamic?Math.sin(t*2.0)*(.42+.34*intensity):0;
   const sway=dynamic?Math.sin(t*.72)*(.48+.54*intensity):0;
   const baseArm=pose.arm-6.5*talk-2.8*listen+1.5*think;
   const leftArm=baseArm+(dynamic?Math.sin(t*1.03)*.85*intensity:0)+leftTalk*4.0;
   const rightArm=baseArm+(dynamic?Math.sin(t*1.26+.6)*.80*intensity:0)+rightTalk*5.0;
   const target={
     leftShoulderX:dynamic?Math.sin(t*.67)*1.1*intensity:0,
     rightShoulderX:dynamic?-Math.sin(t*.81+.7)*1.0*intensity:0,
     leftShoulderY:(dynamic?-(1.8*listen+.65*Math.sin(t*.72)*intensity):0),
     rightShoulderY:(dynamic?(1.8*listen+.65*Math.sin(t*.81+.3)*intensity):0),
     leftShoulderZ:pose.shoulder+(dynamic?Math.sin(t*.71)*.55*intensity:0),
     rightShoulderZ:-pose.shoulder+(dynamic?-Math.sin(t*.78+.3)*.55*intensity:0),

     leftUpperArmX:dynamic?2.2*intensity+1.6*leftTalk:0,
     rightUpperArmX:dynamic?-2.2*intensity-2.0*rightTalk:0,
     leftUpperArmY:-(pose.upperY+5*talk+2.5*listen+(dynamic?Math.sin(t*.91)*2.0*intensity:0)),
     rightUpperArmY:pose.upperY+6*talk+(dynamic?Math.sin(t*.76+.6)*2.1*intensity:0),
     leftUpperArmZ:leftArm,
     rightUpperArmZ:-rightArm,

     leftLowerArmX:dynamic?2.3*leftTalk:0,
     rightLowerArmX:dynamic?-3.0*rightTalk:0,
     leftLowerArmY:-(pose.lowerY+18*talk+3*think+5*leftTalk),
     rightLowerArmY:pose.lowerY+21*talk+3*listen+7*rightTalk,
     leftLowerArmZ:pose.elbow-6*talk+(dynamic?Math.sin(t*1.5+.4)*2.1*intensity:0),
     rightLowerArmZ:-pose.elbow+7*talk+(dynamic?-Math.sin(t*1.7+.8)*2.6*intensity:0),

     leftHandX:dynamic?6*leftTalk+Math.sin(t*1.2)*2.2*intensity:0,
     rightHandX:dynamic?-7*rightTalk-Math.sin(t*1.35+.3)*2.4*intensity:0,
     leftHandY:dynamic?-4.5*intensity+Math.sin(t*1.13+.8)*2.2*intensity:0,
     rightHandY:dynamic?4.5*intensity+Math.sin(t*1.36)*2.7*intensity:0,
     leftHandZ:pose.handZ+(dynamic?Math.sin(t*1.33)*3.2*intensity:0),
     rightHandZ:-pose.handZ-(dynamic?Math.sin(t*1.47+.65)*3.5*intensity:0),

     chestX:breath*.65,chestY:dynamic?Math.sin(t*.42)*.45*intensity:0,
     chestZ:dynamic?Math.sin(t*.57)*.17*intensity:0,
     spineX:dynamic?Math.sin(t*.67)*.34*intensity:0,
     spineY:dynamic?Math.sin(t*.49)*.3*intensity:0,
     spineZ:sway*.42,hipsZ:sway*.30,
   };

   const blend=(key,value,power)=>{target[key]=target[key]*(1-power)+value*power;};
   const g=gestureStrength;
   if(g>.0001){
     switch(this.gestureName){
      case 'wave':
       // Right upper arm lifts, forearm bends forwards, wrist twists and waves.
       blend('rightUpperArmZ',-36,g);blend('rightUpperArmY',18,g);
       blend('rightUpperArmX',-8,g);blend('rightLowerArmZ',74,g);
       blend('rightLowerArmY',25,g);blend('rightLowerArmX',6,g);
       blend('rightHandX',Math.sin(this.gestureTime*7.6)*22,g);
       blend('rightHandY',Math.cos(this.gestureTime*6.6)*14,g);
       blend('rightHandZ',Math.sin(this.gestureTime*8.0)*13,g);
       blend('rightShoulderZ',-3.5,g);break;
      case 'explain':
       blend('leftUpperArmZ',44,g);blend('rightUpperArmZ',-48,g);
       blend('leftUpperArmY',-17,g);blend('rightUpperArmY',19,g);
       blend('leftLowerArmY',-39,g);blend('rightLowerArmY',43,g);
       blend('leftLowerArmZ',-22,g);blend('rightLowerArmZ',25,g);
       blend('leftHandX',-9+5*Math.sin(t*2.7),g);
       blend('rightHandX',9+6*Math.sin(t*2.4+.8),g);
       blend('leftHandY',-14,g);blend('rightHandY',13,g);break;
      case 'point':
       // Gesture in 3D, not genuine IK or finger pointing.
       blend('rightUpperArmZ',-54,g);blend('rightUpperArmY',24,g);
       blend('rightUpperArmX',-7,g);blend('rightLowerArmY',31,g);
       blend('rightLowerArmZ',17,g);blend('rightHandX',-7,g);
       blend('rightHandY',7,g);break;
      case 'welcome':
       blend('leftUpperArmZ',38,g);blend('rightUpperArmZ',-42,g);
       blend('leftUpperArmY',-10,g);blend('rightUpperArmY',12,g);
       blend('leftLowerArmY',-32,g);blend('rightLowerArmY',35,g);
       blend('leftLowerArmZ',-23,g);blend('rightLowerArmZ',24,g);
       blend('leftHandX',-7,g);blend('rightHandX',7,g);break;
     }
   }

   // Scale movements into the screen's depth by a dedicated control.
   for(const k of Object.keys(target)){
     if((k.endsWith('UpperArmY')||k.endsWith('LowerArmY')||k.endsWith('ShoulderY'))){target[k]*=depth*depthSign;}
     if(k.endsWith('HandX')||k.endsWith('HandY')||k.endsWith('HandZ')){target[k]*=wrist;}
   }

   const current={};
   for(const [key,unbounded] of Object.entries(target)){
     let limit=90;
     if(key.includes('UpperArm'))limit=bounds['upper'+key.at(-1)];
     else if(key.includes('LowerArm'))limit=bounds['lower'+key.at(-1)];
     else if(key.includes('Shoulder'))limit=bounds['shoulder'+key.at(-1)];
     else if(key.includes('Hand'))limit=bounds['hand'+key.at(-1)];
     else if(key.startsWith('chest'))limit=bounds['chest'+key.at(-1)];
     else if(key.startsWith('spine'))limit=bounds['spine'+key.at(-1)];
     else if(key.startsWith('hips'))limit=bounds['hips'+key.at(-1)];
     const goal=clamp(unbounded,-limit,limit);
     // Small kinetic chain delay: proximal joints move first, wrists settle last.
     const jointRate=key.includes('Shoulder')?speed*1.02:
       key.includes('UpperArm')?speed:
       key.includes('LowerArm')?speed*.83:
       key.includes('Hand')?speed*.70:
       key.startsWith('hips')?speed*.56:speed*.90;
     this.angle[key]=smooth(this.angle[key]??0,goal,dt,jointRate);
     current[key]=this.angle[key]*DEG;
   }
   return {...current,behavior,pose:cfg.bodyPose||'natural',
      gesture:this.gestureName,waveActive:this.waveActive,explainActive:this.explainActive};
 }
}
