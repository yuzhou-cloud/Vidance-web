importScripts('./pose-math.js');
onmessage=({data})=>{
  try {
    const {reference,practice,offset,mirror,generation}=data;
    const filter=new VidanceMath.FeedbackState();let j=0;const samples=[];
    for(const r of reference.frames){
      const target=r.time+offset;
      while(j+1<practice.frames.length&&practice.frames[j+1].time<=target)j++;
      const p=practice.frames[j];
      const valid=target>=0&&target<practice.duration&&r.tracked&&r.valid3d&&p?.tracked;
      const observations=VidanceMath.compare(r.keypoints,valid?p.keypoints:null,mirror);
      const flags=filter.update(observations,r.time*1000).map(f=>({...f}));
      samples.push({time:r.time,userFrame:valid?j:null,feedback:flags});
    }
    postMessage({generation,samples,offset,mirror});
  } catch(error){postMessage({generation:data.generation,error:error.message})}
};
