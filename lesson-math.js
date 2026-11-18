/* Timing and review helpers shared by the practice UI and tests. */
(function(root){
function sections(duration,bpm,first=0){
  if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(bpm)||bpm<40||bpm>240)return [];
  first=Math.max(0,Math.min(duration,Number(first)||0));
  const out=[],length=480/bpm;
  if(first>0.02)out.push({start:0,end:first,intro:true,number:0});
  for(let start=first,n=1;start<duration-.001;start=first+n++*length)out.push({start,end:Math.min(duration,start+length),number:n,intro:false,partial:duration-start<length-.05});
  return out;
}
function state(flags){
  if(!flags?.length)return 'unknown';
  if(flags.some(f=>f.status!=='unavailable'&&f.alpha>.05))return 'error';
  if(flags.length>=9&&flags.every(f=>f.status==='close'&&f.alpha<=.05))return 'good';
  return 'unknown';
}
function intervals(samples,duration,offset=0){
  const out=[];
  for(let i=0;i<(samples?.length||0);i++){
    const a=samples[i],start=Math.max(0,a.time+offset),end=Math.min(duration,(samples[i+1]?.time??a.time+.04)+offset,a.time+offset+.3);
    if(start>=end)continue;
    const kind=state(a.feedback),last=out.at(-1);
    if(last&&last.kind===kind&&Math.abs(last.end-start)<.002)last.end=end;else out.push({start,end,kind});
  }return out;
}
function estimateBeat(samples,sampleRate){
  // Audio energy changes suggest tempo; the first beat is always user-confirmable.
  const hop=Math.max(1,Math.round(sampleRate*.01)),energy=[];
  for(let i=0;i<samples.length;i+=hop){let sum=0;for(let j=i;j<Math.min(i+hop,samples.length);j++)sum+=samples[j]*samples[j];energy.push(Math.sqrt(sum/hop));}
  const onset=energy.map((v,i)=>Math.max(0,v-(energy[i-1]||v))),rate=sampleRate/hop;
  let best=0,bestLag=0;
  for(let lag=Math.round(rate*60/180);lag<=Math.round(rate*60/65);lag++){
    let dot=0,a=0,b=0;for(let i=lag;i<onset.length;i++){dot+=onset[i]*onset[i-lag];a+=onset[i]**2;b+=onset[i-lag]**2;}
    const score=dot/Math.sqrt(a*b||1);if(score>best){best=score;bestLag=lag;}
  }
  if(best<.12||!bestLag)return null;
  const bpm=Math.round(60*rate/bestLag);let phase=0,strength=0;
  for(let p=0;p<bestLag;p++){let sum=0;for(let j=p;j<onset.length;j+=bestLag)sum+=onset[j];if(sum>strength){strength=sum;phase=p;}}
  return {bpm,first:phase/rate,confidence:best};
}
const api={sections,state,intervals,estimateBeat};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VidanceLessonMath=api;
})(globalThis);
