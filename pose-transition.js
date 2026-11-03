/** R8: puente de pose breve durante cambios entre clips FBX.
 * Captura las rotaciones actuales y las interpola hacia el nuevo clip sin alterar archivos.
 * Se usa después de AnimationMixer.update y antes de VRM.update.
 */
export class PoseTransition {
  constructor(duration=.42){this.duration=duration;this.remaining=0;this.captured=[];}
  capture(nodes,duration=this.duration){
    this.captured=[];
    for(const node of nodes){
      if(node?.quaternion?.clone&&node?.quaternion?.slerpQuaternions)
        this.captured.push({node,from:node.quaternion.clone()});
    }
    this.remaining=this.captured.length?Math.max(.05,Number(duration)||this.duration):0;
    this.duration=this.remaining||this.duration;
    return this.captured.length;
  }
  step(dt){
    if(this.remaining<=0)return 0;
    this.remaining=Math.max(0,this.remaining-Math.max(0,Number(dt)||0));
    if(this.remaining<1e-8)this.remaining=0;
    const progress=1-this.remaining/this.duration;
    const smooth=progress*progress*(3-2*progress);
    for(const {node,from} of this.captured){
      // Quaternions are produced by the FBX mixer or procedural body for this frame.
      node.quaternion.slerpQuaternions(from,node.quaternion,smooth);
    }
    if(this.remaining<=0)this.captured=[];
    return this.captured.length;
  }
  clear(){this.remaining=0;this.captured=[];}
  get active(){return this.remaining>0;}
}
