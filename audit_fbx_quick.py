import struct,zlib,json,sys
from pathlib import Path

def scan_file(path):
 b=Path(path).read_bytes();assert b.startswith(b'Kaydara FBX Binary  \x00\x1a\x00')
 ver=struct.unpack_from('<I',b,23)[0]; wide=ver>=7500; head=25 if wide else 13
 props=[]; models=[]; samples=[]; time_series=[]; animstacks=[];model_types=[]
 def node(pos,limit,depth=0):
  while pos+head<=limit:
   start=pos
   if wide:end,n,pl=struct.unpack_from('<QQQ',b,pos);length=b[pos+24]
   else:end,n,pl=struct.unpack_from('<III',b,pos);length=b[pos+12]
   if not end or end<=start or end>len(b):return end or pos
   name=b[pos+head:pos+head+length].decode('utf8','replace');ptr=pos+head+length
   vv=[]
   for _ in range(n):
    typ=chr(b[ptr]);ptr+=1
    if typ in ('S','R'):
     size=struct.unpack_from('<I',b,ptr)[0];ptr+=4;v=b[ptr:ptr+size];ptr+=size
    elif typ in ('F','I'):v=struct.unpack_from('<f' if typ=='F' else '<i',b,ptr)[0];ptr+=4
    elif typ in ('D','L'):v=struct.unpack_from('<d' if typ=='D' else '<q',b,ptr)[0];ptr+=8
    elif typ in ('Y',):v=struct.unpack_from('<h',b,ptr)[0];ptr+=2
    elif typ in ('C','B'):v=b[ptr];ptr+=1
    elif typ in ('c','b','f','d','i','l'):
     count,encoding,size=struct.unpack_from('<III',b,ptr);ptr+=12
     v=(count,encoding,size)
     raw=b[ptr:ptr+size];ptr+=size
     if name=='KeyTime' and typ=='l' and count:
      if encoding==1:raw=zlib.decompress(raw)
      times=struct.unpack_from('<'+str(count)+'q',raw,0)
      time_series.append((min(times),max(times),len(times)))
    else:raise ValueError((name,typ,ptr))
    vv.append(v)
   if name=='Model' and vv:
    x=vv[1] if len(vv)>1 else vv[0]; models.append(x.decode('utf8','ignore') if isinstance(x,bytes) else str(x));model_types.append([v.decode('utf8','ignore') if isinstance(v,bytes) else str(v) for v in vv])
   elif name=='AnimationStack':animstacks.append(str(vv[:2]))
   if end-ptr>head and depth<12:node(ptr,end-head,depth+1)
   pos=end
  return pos
 node(27,len(b))
 return dict(file=Path(path).name,version=ver,models=len(models),bone_models=sum('LimbNode' in vals for vals in model_types),duration_seconds=round(max((m for _,m,_ in time_series),default=0)/46186158000,4),keytime_arrays=len(time_series),max_key_count=max((k for *_,k in time_series),default=0),animation_stacks=len(animstacks))
for f in sys.argv[1:]:
 try:print(json.dumps(scan_file(f),ensure_ascii=False))
 except Exception as e:print(f,repr(e))
