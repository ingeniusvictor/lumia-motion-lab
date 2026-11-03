/** LUMIA R5: deterministic root trajectory for Walk In Circle.fbx.
  keys: [sourceSeconds, worldDeltaX, worldDeltaZ, unwrappedYawRadians].
  Unit tested. One cycle closes near the original starting position.
*/
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function sampleCircleMotion(keys,time){
 if(!Array.isArray(keys)||keys.length<2)throw new Error('Circle keys unavailable');
 const t=Number.isFinite(time)?time:0;
 if(t<=keys[0][0])return {x:keys[0][1],z:keys[0][2],yaw:keys[0][3]};
 const end=keys[keys.length-1];
 if(t>=end[0])return {x:end[1],z:end[2],yaw:end[3]};
 let lo=0,hi=keys.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>1;if(keys[mid][0]<=t)lo=mid;else hi=mid;}
 const a=keys[lo],b=keys[hi],s=clamp((t-a[0])/(b[0]-a[0]),0,1);
 return {x:a[1]+(b[1]-a[1])*s,z:a[2]+(b[2]-a[2])*s,yaw:a[3]+(b[3]-a[3])*s};
}
export function createCircleWalkController(keys){
 let active=false;
 const initial={x:0,z:0,yaw:0};
 return {
  begin(start={}){initial.x=start.x??0;initial.z=start.z??0;initial.yaw=start.yaw??0;active=true;},
  halt(){active=false;},
  get active(){return active;},
  get initial(){return {...initial};},
  advance(time){
   if(!active)return null;
   const p=sampleCircleMotion(keys,time);
   const cos=Math.cos(initial.yaw),sin=Math.sin(initial.yaw);
   // Rotate source displacement into direction the avatar was facing at the start.
   const x=initial.x+p.x*cos+p.z*sin;
   const z=initial.z-p.x*sin+p.z*cos;
   const yaw=initial.yaw+p.yaw;
   if(time>=keys[keys.length-1][0])active=false;
   return {x,z,yaw,completed:!active};
  }
 };
}
