/**
 * L.U.M.I.A. Motion Stability R3.
 * Correcciones NO destructivas de keyframes quaternion de FBX importados.
 * Se conservan intactos los FBX originales. No modifica transiciones faciales.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function normalizedDot(a,b){
 const ma=Math.hypot(...a),mb=Math.hypot(...b);
 if(ma<1e-9||mb<1e-9)return 1;
 return clamp(a.reduce((s,v,i)=>s+v*b[i],0)/(ma*mb),-1,1);
}
function getQ(values,index){return Array.from(values.slice(index*4,index*4+4));}
function putQ(values,index,q){for(let c=0;c<4;c++)values[index*4+c]=q[c];}
function slerp(a,b,t){
 let c=normalizedDot(a,b),bb=b.slice();
 if(c<0){bb=bb.map(x=>-x);c=-c;}
 const rad=Math.acos(clamp(c,-1,1));
 let v;
 if(rad<1e-5)v=a.map((x,i)=>x*(1-t)+bb[i]*t);
 else {const inv=1/Math.sin(rad),u=Math.sin((1-t)*rad)*inv,w=Math.sin(t*rad)*inv;v=a.map((x,i)=>x*u+bb[i]*w);}
 const m=Math.hypot(...v)||1;return v.map(x=>x/m);
}
export function findMicroSpikeSteps(times,values,{degrees=25,maxSeconds=0.012}={}){
 const out=[];
 for(let i=1;i<times.length;i++){
  const dt=times[i]-times[i-1];if(dt<=0||dt>maxSeconds)continue;
  const angle=2*Math.acos(clamp(Math.abs(normalizedDot(getQ(values,i-1),getQ(values,i))),0,1))*180/Math.PI;
  if(angle>degrees)out.push({index:i,time:times[i],seconds:dt,degrees:angle});
 }
 return out;
}
export function repairQuaternionMicroSpikes(clip,{enabled=true,windowSeconds=0.095}={}){
 const report={enabled,tracksChecked:0,affectedTracks:[],spikeCount:0,segments:0};
 if(!enabled||!clip?.tracks)return report;
 for(const track of clip.tracks){
  if(!track.name?.endsWith('.quaternion')||track.getValueSize?.()!==4)continue;
  report.tracksChecked++;
  const times=track.times,values=track.values;
  const spikes=findMicroSpikeSteps(times,values);
  if(!spikes.length)continue;
  // Se calcula sobre una copia: la detección y las correcciones no se contaminan.
  const original=values.slice(),segments=[];
  for(const spike of spikes){
   const left=spike.time-windowSeconds,right=spike.time+windowSeconds;
   const prev=segments.at(-1);
   if(prev&&left<=prev.end){prev.end=Math.max(prev.end,right);prev.spikes.push(spike);}
   else segments.push({start:left,end:right,spikes:[spike]});
  }
  for(const segment of segments){
   let lo=0,hi=times.length-1;
   while(lo+1<times.length&&times[lo+1]<=segment.start)lo++;
   while(hi-1>=0&&times[hi-1]>=segment.end)hi--;
   if(hi-lo<2)continue;
   const a=getQ(original,lo),b=getQ(original,hi);
   const duration=times[hi]-times[lo];if(duration<1e-9)continue;
   for(let i=lo+1;i<hi;i++)putQ(values,i,slerp(a,b,clamp((times[i]-times[lo])/duration,0,1)));
   report.segments++;
  }
  report.spikeCount+=spikes.length;
  report.affectedTracks.push({name:track.name,spikes:spikes.length,maxSpeedDegreesPerSecond:Math.round(Math.max(...spikes.map(s=>s.degrees/s.seconds)))});
 }
 return report;
}
