import assert from 'node:assert/strict';
import {BodyMotionCore} from './body-motion-core.js';
const rad=d=>d*Math.PI/180;
const cfg={bodyPose:'natural',bodyMotion:true,bodyIntensity:.60,bodySpeed:5,bodyDepth:.75,bodyWrist:.75,bodyDepthSign:1,live:true,behavior:'idle'};
const core=new BodyMotionCore();
const axes=['leftUpperArmX','leftUpperArmY','leftUpperArmZ','rightUpperArmX','rightUpperArmY','rightUpperArmZ',
  'leftLowerArmX','leftLowerArmY','leftLowerArmZ','rightLowerArmX','rightLowerArmY','rightLowerArmZ',
  'leftHandX','leftHandY','leftHandZ','rightHandX','rightHandY','rightHandZ'];
function simulate(duration, options=cfg, collect=()=>{}){
 let s; const frames=Math.round(duration*60);
 for(let i=0;i<frames;i++){
  s=core.step(1/60,options);
  for(const a of axes)assert.ok(Number.isFinite(s[a]),`Invalid ${a}`);
  collect(s,i);
 }
 return s;
}
let s=simulate(4);
assert.ok(s.leftUpperArmZ>rad(67));
assert.ok(s.rightUpperArmZ<-rad(67));
assert.ok(s.leftUpperArmY<-rad(1),'Upper arm needs forward depth');
assert.ok(s.leftLowerArmY<-rad(2),'Elbow/forearm needs depth');
assert.ok(s.rightLowerArmY>rad(2));
const idleR=s;
const speaking=simulate(4,{...cfg,behavior:'speaking'});
assert.ok(speaking.leftUpperArmZ < idleR.leftUpperArmZ, 'speech should open left arm');
assert.ok(speaking.rightUpperArmZ > idleR.rightUpperArmZ, 'speech should open right arm');
// wave must involve at least THREE non-planar axes and return smoothly.
core.requestWave();
let maxWave={lowerY:0,wristX:0,wristY:0,upperY:0,lowerZ:0};
simulate(3.3,cfg,r=>{
 maxWave.lowerY=Math.max(maxWave.lowerY,Math.abs(r.rightLowerArmY));
 maxWave.wristX=Math.max(maxWave.wristX,Math.abs(r.rightHandX));
 maxWave.wristY=Math.max(maxWave.wristY,Math.abs(r.rightHandY));
 maxWave.upperY=Math.max(maxWave.upperY,Math.abs(r.rightUpperArmY));
 maxWave.lowerZ=Math.max(maxWave.lowerZ,Math.abs(r.rightLowerArmZ));
});
assert.ok(maxWave.lowerY>rad(9), 'wave needs elbow depth');
assert.ok(maxWave.wristX>rad(4), 'wave needs wrist roll');
assert.ok(maxWave.wristY>rad(3), 'wave needs wrist yaw');
assert.ok(maxWave.upperY>rad(5), 'wave needs forward shoulder');
assert.ok(maxWave.lowerZ>rad(35), 'wave needs elbow raise');
assert.equal(core.gestureName,null);
core.requestExplain();
let explainDepth=0,explainOpen=0;
simulate(4.5,cfg,r=>{
 explainDepth=Math.max(explainDepth,Math.abs(r.leftLowerArmY));
 explainOpen=Math.max(explainOpen,Math.abs(r.leftUpperArmY));
});
assert.ok(explainDepth>rad(12));
assert.ok(explainOpen>rad(7));
core.requestPoint();
let pointY=0;simulate(3.2,cfg,r=>{pointY=Math.max(pointY,Math.abs(r.rightUpperArmY));});
assert.ok(pointY>rad(9));
core.requestWelcome();
let welcomeY=0;simulate(4,cfg,r=>{welcomeY=Math.max(welcomeY,Math.abs(r.leftLowerArmY));});
assert.ok(welcomeY>rad(10));
// Disable depth - only Y rotations are suppressed while X/Z keep moving.
const depthOff=simulate(4,{...cfg,bodyDepth:0});
assert.ok(Math.abs(depthOff.leftUpperArmY)<rad(.01));
assert.ok(Math.abs(depthOff.rightLowerArmY)<rad(.01));
// Disable wrist motion
const wristOff=simulate(4,{...cfg,bodyDepth:0,bodyWrist:0});
for(const a of ['leftHandX','leftHandY','leftHandZ','rightHandX','rightHandY','rightHandZ'])assert.ok(Math.abs(wristOff[a])<rad(.01),a);
// Invert depth direction should change sign and maintain bounds
const inverted=simulate(4,{...cfg,bodyDepthSign:-1});
assert.ok(inverted.leftLowerArmY>rad(2));
const tpose=simulate(4,{...cfg,bodyPose:'tpose'});
assert.ok(Math.abs(tpose.leftUpperArmZ)<rad(.1));
assert.ok(Math.abs(tpose.leftUpperArmY)<rad(.1));
assert.ok(Math.abs(tpose.leftHandX)<rad(.1));
const formal=simulate(4,{...cfg,bodyPose:'formal',bodyMotion:false});
assert.ok(formal.leftUpperArmZ>rad(76));
assert.ok(Math.abs(formal.chestX)<1e-5);
// Invalid delta and inputs do not create NaN
const weird=core.step(500,{...cfg,bodyDepth:999,bodyWrist:-50,bodySpeed:999});
for(const a of axes)assert.ok(Number.isFinite(weird[a]));
console.log(JSON.stringify({PASS:true,tests:['VRM arm-axis 3D','idle posture','asymmetric speaking','3-axis wave','explain in depth','point forward','welcome','depth off','wrist off','invert depth','T pose','static pose','numerical bounds'],maxWave_deg:Object.fromEntries(Object.entries(maxWave).map(([k,v])=>[k,Math.round(v*180/Math.PI*10)/10]))},null,2));
