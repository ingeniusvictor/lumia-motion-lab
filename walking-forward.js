/** LUMIA v0.8.4 R4 — recorrido extraído del FBX de caminar adelante.
 * keys: [timeSeconds, forwardMeters] from Mixamo LUMIA_FULL_SKIN_1 root translation Z.
 * The character faces toward the viewer (-Z), so forwardMeters maps to scene.position.z -= delta.
 */
export function sampleForwardWalk(keys,time){
  if(!Array.isArray(keys)||keys.length===0)return 0;
  if(!Number.isFinite(time)||time<=keys[0][0])return keys[0][1];
  if(time>=keys[keys.length-1][0])return keys[keys.length-1][1];
  let lo=0,hi=keys.length-1;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(keys[mid][0]<=time)lo=mid;else hi=mid;}
  const [t0,v0]=keys[lo],[t1,v1]=keys[hi];
  return v0+(v1-v0)*((time-t0)/(t1-t0));
}
export function createForwardWalkController(keys){
 let active=false,lastMeters=0;
 return {
  begin(){active=true;lastMeters=0;},
  halt(){active=false;},
  get active(){return active;},
  advance(elapsedSourceSeconds){
   if(!active)return 0;
   const meters=sampleForwardWalk(keys,elapsedSourceSeconds);
   const delta=meters-lastMeters;
   lastMeters=meters;
   if(elapsedSourceSeconds>=keys[keys.length-1][0]-1e-6)active=false;
   return delta;
  },
  get coveredMeters(){return lastMeters;}
 };
}
