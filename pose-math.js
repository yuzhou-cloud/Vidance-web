/* Shared deterministic comparison and hysteresis. 2D evidence only; not a dance-quality score. */
(function(root){
const parts=[['left_upper_arm','左上臂',5,7,[5,7]],['left_forearm','左前臂',7,9,[5,7,9]],['right_upper_arm','右上臂',6,8,[6,8]],['right_forearm','右前臂',8,10,[6,8,10]],['left_thigh','左大腿',11,13,[11,13]],['left_calf','左小腿',13,15,[11,13,15]],['right_thigh','右大腿',12,14,[12,14]],['right_calf','右小腿',14,16,[12,14,16]]];
const swap=[0,2,1,4,3,6,5,8,7,10,9,12,11,14,13,16,15];
function canonical(points,mirror){if(!points||points.length!==17)return null;let p=points.map(q=>q.slice());if(mirror)p=swap.map(i=>[-p[i][0],p[i][1],p[i][2]]);if([5,6,11,12].some(i=>p[i][2]<.6))return null;const hip=[(p[11][0]+p[12][0])/2,(p[11][1]+p[12][1])/2],sh=[(p[5][0]+p[6][0])/2,(p[5][1]+p[6][1])/2],up=[sh[0]-hip[0],sh[1]-hip[1]],scale=Math.hypot(...up);if(scale<.0001)return null;up[0]/=scale;up[1]/=scale;return p.map(q=>{const x=q[0]-hip[0],y=q[1]-hip[1];return [(-x*up[1]+y*up[0])/scale,(x*up[0]+y*up[1])/scale,q[2]]})}
function compare(reference,user,mirror=false){const a=canonical(reference),b=canonical(user,mirror);return parts.map(([id,label,start,end,required])=>{const item={id,label,joints:[start,end],userJoints:mirror?[swap[start],swap[end]]:[start,end],status:'unavailable',difference:null};if(!a||!b||required.some(i=>a[i][2]<.6||b[i][2]<.6))return item;const u=[a[end][0]-a[start][0],a[end][1]-a[start][1]],v=[b[end][0]-b[start][0],b[end][1]-b[start][1]],norm=Math.hypot(...u)*Math.hypot(...v);if(norm<1e-8)return item;const d=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/norm)))*180/Math.PI;return {...item,difference:d,status:d>25?'different':d<15?'close':'borderline'}}).concat([torso(reference,user,mirror)])}
function torso(reference,user,mirror){const result={id:'torso',label:'躯干',joints:[11,5],userJoints:mirror?[12,6]:[11,5],status:'unavailable',difference:null};if(!reference||!user||[5,6,11,12].some(i=>reference[i][2]<.6||user[i][2]<.6))return result;let u=user.map(p=>p.slice());if(mirror)u=swap.map(i=>[-u[i][0],u[i][1],u[i][2]]);const vector=p=>[(p[5][0]+p[6][0]-p[11][0]-p[12][0])/2,(p[5][1]+p[6][1]-p[11][1]-p[12][1])/2],a=vector(reference),b=vector(u),n=Math.hypot(...a)*Math.hypot(...b);if(n<1e-8)return result;const d=Math.acos(Math.max(-1,Math.min(1,(a[0]*b[0]+a[1]*b[1])/n)))*180/Math.PI;return {...result,difference:d,status:d>20?'different':d<12?'close':'borderline'}}
class FeedbackState{constructor(){this.clear()}clear(){this.items={};this.last=null}update(results,now){const dt=this.last===null?0:Math.min(.2,Math.max(0,(now-this.last)/1000));this.last=now;for(const r of results){const old=this.items[r.id]||{alpha:0,bad:0,good:0};if(r.status==='different'){old.bad+=dt;old.good=0;if(old.bad>=.35)old.alpha=Math.min(1,old.alpha+dt*4)}else if(r.status==='close'){old.bad=0;old.good+=dt;if(old.good>=.5)old.alpha=Math.max(0,old.alpha-dt/0.8)}else{old.bad=0;old.good=0}this.items[r.id]={...old,...r}}return Object.values(this.items)}}
// Retarget limb lengths, preserving reference directions rather than matching user endpoints.
function fitReference(reference,user,mirror=false){
 if(!reference||!user||[5,6,11,12].some(i=>reference[i][2]<.6||user[i][2]<.6))return null;
 const r=mirror?swap.map(i=>[-reference[i][0],reference[i][1],reference[i][2]]):reference;
 const hip=p=>[(p[11][0]+p[12][0])/2,(p[11][1]+p[12][1])/2];
 const a=hip(r),b=hip(user),torso=p=>Math.hypot((p[5][0]+p[6][0])/2-hip(p)[0],(p[5][1]+p[6][1])/2-hip(p)[1]);
 const scale=torso(user)/Math.max(torso(r),1e-5);
 const out=r.map(q=>[b[0]+(q[0]-a[0])*scale,b[1]+(q[1]-a[1])*scale,q[2]]);
 for(const [start,end] of [[5,7],[7,9],[6,8],[8,10],[11,13],[13,15],[12,14],[14,16]]){
  if([r[start],r[end],user[start],user[end]].some(q=>q[2]<.6)){out[end][2]=0;continue}
  const dx=r[end][0]-r[start][0],dy=r[end][1]-r[start][1],n=Math.hypot(dx,dy),len=Math.hypot(user[end][0]-user[start][0],user[end][1]-user[start][1]);
  if(n<1e-5){out[end][2]=0;continue}out[end]=[out[start][0]+dx/n*len,out[start][1]+dy/n*len,Math.min(out[start][2],r[end][2],user[end][2])];
 }return out;
}
function segments(samples,minSeconds=2){
 const clips=[],runs=new Map();let last=null;
 function finish(key,end){const run=runs.get(key);if(run&&end-run.start>=minSeconds)clips.push({...run,end});runs.delete(key)}
 for(const sample of samples){const t=sample.time;if(last!==null&&t-last>.3){for(const key of [...runs.keys()])finish(key,last);}
 const flags=sample.feedback||[],active=new Map();
 for(const f of flags)if(f.status==='different')active.set(f.id,{kind:'attention',label:f.label,part:f.id});
 if(flags.length>=9&&flags.every(f=>f.status==='close'))active.set('all',{kind:'encouragement',label:'全身可见肢段',part:'all'});
 for(const key of [...runs.keys()])if(!active.has(key))finish(key,t);
 for(const [key,value]of active)if(!runs.has(key))runs.set(key,{...value,start:t});last=t;
 }for(const key of [...runs.keys()])finish(key,last??0);return clips.sort((a,b)=>a.start-b.start);
}
const api={parts,compare,canonical,FeedbackState,fitReference,segments};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VidanceMath=api;
})(typeof window==='undefined'?globalThis:window);
