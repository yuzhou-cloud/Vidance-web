/* A focused practice session uses the same video, analysis and recorder state. */
(()=>{
const entry=$('#startPractice'),exit=$('#exitPractice');let entering=false;
function leave(stop=true){if(window.lessonBusy?.()){toast('请先停止录像或等待导出完成');return false;}document.body.classList.remove('immersive-practice');$('#cameraPlaceholder h3').textContent='上传你的练习视频';$('#cameraPlaceholder p').textContent='选择实时镜头，或上传视频完成分析后回看。';exit.hidden=true;if(stop){pauseLesson();window.stopLive?.();}return true;}
window.exitImmersivePractice=leave;
entry.onclick=async()=>{
 if(entering||window.lessonBusy?.())return;
 if(source!=='reference'||!referenceData)return toast('请先选择已分析的舞蹈，再开始练习');
 entering=true;pauseLesson();window.mySkeletonActive=false;
 if(mode!=='compare')$('[data-mode="compare"]').click();
 window.setReferenceView('front');window.setCameraCollapsed(false);
 $('#cameraPlaceholder h3').textContent='开启镜头后跟练';$('#cameraPlaceholder p').textContent='允许摄像头访问，保持单人全身入镜。';document.body.classList.add('immersive-practice');exit.hidden=false;window.scrollTo({top:0,behavior:'instant'});
 try{if(!window.liveActive)await startLive();}finally{entering=false;}
};
exit.onclick=()=>leave();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('immersive-practice')&&!document.querySelector('dialog[open]'))leave();});
const marks=document.createElement('div');marks.id='practiceProgressMarks';marks.className='practice-progress-marks';marks.setAttribute('aria-label','整段练习偏差片段');$('.playback-speed').before(marks);
const previous=window.comparisonCompleted;
window.comparisonCompleted=()=>{
 previous?.();marks.replaceChildren();if(!comparisonData||!take)return;
 for(const run of LM.intervals(comparisonData.frames,take.duration,offset)){
  const start=Math.max(0,run.start-offset),end=Math.min(total,run.end-offset);if(end<=start)continue;
  const button=document.createElement('button');button.className='review-'+run.kind;button.style.left=start/total*100+'%';button.style.width=(end-start)/total*100+'%';
  const label=run.kind==='error'?'动作需要调整':run.kind==='good'?'接近参照':'无法判断';button.setAttribute('aria-label',`${start.toFixed(1)}–${end.toFixed(1)} 秒 ${label}`);
  button.onclick=()=>{if(window.lessonBusy?.())return;pauseLesson();seek(start);toast(label);};marks.append(button);
 }
};
const preparing=window.practicePreparing;
window.practicePreparing=file=>{marks.replaceChildren();preparing?.(file);};
window.autoConfirmRecordedPractice=()=>Boolean(pendingTake);
})();
