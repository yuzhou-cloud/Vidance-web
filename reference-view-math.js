/* Screen-space alignment for the frontal 3D mesh over the original video. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.VidanceReferenceView=api;})(typeof window==='object'?window:globalThis,()=>{
function align(pose,p,width,height,vw,vh){
 if(!pose||!p||!width||!height||!vw||!vh)return pose;
 const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,Math.min(a[2],b[2])],hip=mid(p[11],p[12]),shoulder=mid(p[5],p[6]);
 const pts=[hip,mid(hip,shoulder),shoulder,p[0],p[5],p[7],p[9],p[6],p[8],p[10],p[11],p[13],p[15],p[12],p[14],p[16]],scale=Math.min(vw/width,vh/height),dx=(vw-width*scale)/2,dy=(vh-height*scale)/2;
 return pts.map((q,i)=>[(dx+q[0]*scale-vw/2)*3/vh,.95+(vh/2-dy-q[1]*scale)*3/vh,pose[i][2]]);
}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
return {align,ease};
});
