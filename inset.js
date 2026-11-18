/* Borderless reference preview. A drag never toggles the collapsed state. */
(() => {
  const box=document.querySelector('#referenceInset'),video=document.querySelector('#referenceVideo'),stage=box.parentElement;
  const key='vidance.referenceInset.v3';let state={x:.03,y:.65,width:.2,compact:false},gesture=null,suppressClick=false;
  try{const value=JSON.parse(localStorage.getItem(key));if(value&&['x','y','width'].every(k=>Number.isFinite(value[k])))state={...state,x:value.x,y:value.y,width:value.width,compact:localStorage.getItem(key)?Boolean(value.compact):false}}catch{}
  function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
  function place(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    box.classList.toggle('compact',state.compact);
    const width=state.compact?40:Math.max(48,Math.min(115,w*.3,w*state.width,(h*.28)*(video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9)));
    const ratio=video.videoWidth&&video.videoHeight?video.videoWidth/video.videoHeight:16/9;
    const height=state.compact?40:Math.max(24,Math.min(width/ratio,h-16));
    box.style.width=width+'px';box.style.height=height+'px';
    const x=Math.max(8,Math.min(Math.max(8,w-width-8),state.x*w)),y=Math.max(8,Math.min(Math.max(8,h-height-8),state.y*h));
    box.style.left=x+'px';box.style.top=y+'px';
    box.setAttribute('aria-label',state.compact?'展开原视频小窗，也可拖动移动':'原视频小窗，拖动移动，点击收起');box.setAttribute('aria-pressed',String(state.compact));
  }
  function toggle(){state.compact=!state.compact;place();save()}
  box.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();suppressClick=false;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.offsetLeft,top:box.offsetTop,moved:false};box.setPointerCapture(e.pointerId)});
  box.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.moved&&Math.hypot(dx,dy)<6)return;gesture.moved=true;box.classList.add('dragging');state.x=(gesture.left+dx)/stage.clientWidth;state.y=(gesture.top+dy)/stage.clientHeight;place()});
  function finish(e){if(!gesture||gesture.id!==e.pointerId)return;suppressClick=gesture.moved||e.type==='pointercancel';gesture=null;box.classList.remove('dragging');if(box.hasPointerCapture(e.pointerId))box.releasePointerCapture(e.pointerId);save()}
  box.addEventListener('pointerup',finish);box.addEventListener('pointercancel',finish);
  box.addEventListener('click',e=>{e.stopPropagation();if(suppressClick){suppressClick=false;return}toggle()});
  box.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();return}const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(!directions[e.key])return;e.preventDefault();const step=e.shiftKey?25:8;state.x+=directions[e.key][0]*step/stage.clientWidth;state.y+=directions[e.key][1]*step/stage.clientHeight;place();save()});
  video.addEventListener('loadedmetadata',place);new MutationObserver(place).observe(video,{attributes:true,attributeFilter:['class']});new ResizeObserver(place).observe(stage);new MutationObserver(place).observe(document.querySelector('#studio'),{attributes:true,attributeFilter:['class']});place();
})();
