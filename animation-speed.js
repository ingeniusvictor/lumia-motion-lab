/** v0.8.4 R2 — playback time scaling for original FBX clips. */
export const MIN_CLIP_SPEED = 0.35;
export const MAX_CLIP_SPEED = 1.50;
export const DEFAULT_CLIP_SPEED = 0.70;
export function clampClipSpeed(value){
 const num=Number(value);
 return Number.isFinite(num)?Math.max(MIN_CLIP_SPEED,Math.min(MAX_CLIP_SPEED,num)):DEFAULT_CLIP_SPEED;
}
export function clipDurationAtSpeed(sourceSeconds, speed, repetitions=1){
 if(repetitions===Infinity)return Infinity;
 if(!Number.isFinite(sourceSeconds)||sourceSeconds<0)return 0;
 return (sourceSeconds*Math.max(0,repetitions))/clampClipSpeed(speed);
}
export function secondsRemaining(sourceSeconds, elapsedSourceSeconds, speed){
 return Math.max(0,sourceSeconds-elapsedSourceSeconds)/clampClipSpeed(speed);
}
export function speedLabel(speed){return `${Math.round(clampClipSpeed(speed)*100)}%`;}
