/** R8: identifica cada sesión de voz para ignorar marcas y finales atrasados. */
export class SpeechSession {
  constructor(){this.counter=0;this.active=null;this.lastEnd=null;}
  begin({source='browser',text=''}={}){
    const session={id:++this.counter,source:String(source),text:String(text??''),offset:0,boundaries:0};
    this.active=session;
    return {...session,phase:'start'};
  }
  boundary(index,id=this.active?.id){
    if(!this.active||id!==this.active.id||!Number.isFinite(Number(index)))return null;
    const next=Math.max(0,Math.min(this.active.text.length,Math.floor(Number(index))));
    if(next<this.active.offset)return null;
    this.active.offset=next;this.active.boundaries++;
    return {...this.active,phase:'boundary',index:next};
  }
  end(id=this.active?.id,reason='ended'){
    if(!this.active||id!==this.active.id)return null;
    const last={...this.active,phase:'end',reason};
    this.lastEnd=last;this.active=null;
    return last;
  }
  get snapshot(){return {counter:this.counter,active:this.active?{...this.active}:null,lastEnd:this.lastEnd?{...this.lastEnd}:null};}
}
