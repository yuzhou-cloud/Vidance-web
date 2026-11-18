/* Eight-count practice, explicit camera recording, and offline review. */
const LM=window.VidanceLessonMath;
let lessonReference=null,lessonFile=null,lessonKey='',lessonSections=[],chosenSection=null,lastCount=-1;
let recording=null,countdownToken=0,counting=false,take=null,pendingTake=null,exportToken=0,exporting=false,lastReview=null;
window.mySkeletonActive=false;window.lessonExporting=false;
const angleChip=document.createElement('span');angleChip.className='angle-chip';angleChip.textContent='开启镜头后显示关节角度';$('.user-view').append(angleChip);
const pauseLesson=()=>{playing=false;ref.pause();if(!window.liveActive)cam.pause();updatePlay()};
window.lessonBusy=()=>Boolean(recording||counting||exporting);
function beatKey(){return 'vidance-beats:'+(currentDance||referenceFile?.name+':'+total||'demo')}
function refreshLesson(){
  lessonReference=referenceData;lessonFile=referenceFile;lessonKey=beatKey();chosenSection=null;lastCount=-1;
  window.mySkeletonActive=false;$('#takeReview').hidden=true;lastReview=null;take=null;pendingTake=null;
  $('#downloadTake').disabled=true;$('#recordStatus').textContent='选好八拍后开启镜头，倒数四拍开始录像。仅录画面，不录声音。';
  let saved;try{saved=JSON.parse(localStorage.getItem(lessonKey))}catch{}
  $('#beatBpm').value=saved?.bpm||120;$('#beatFirst').value=saved?.first||0;
  $('#beatNotice').textContent=saved?'已恢复这支舞的八拍设置，可继续校正。':'按 120 BPM 暂分，可识别音乐或手动校正第一拍。';
  $('#practiceSpeed').value='1';ref.playbackRate=cam.playbackRate=1;
  rebuildSections(false);if(!saved&&referenceFile&&source==='reference')setTimeout(()=>$('#detectBeats').onclick(),0);$('#sourceLabel').textContent=source==='demo'?'动作示例 · 不评价':'已分析 · 3D 参考';
}
function rebuildSections(save=true){
  const bpm=Number($('#beatBpm').value),first=Number($('#beatFirst').value);
  if(!Number.isFinite(bpm)||bpm<40||bpm>240||!Number.isFinite(first)||first<0||first>=total){toast('节奏需在 40–240 BPM，第一拍需在视频范围内');return false;}
  lessonSections=LM.sections(total,bpm,first);chosenSection=null;
  $('#beatFirst').max=Math.max(0,total-.01);$('#eightSections').replaceChildren();
  lessonSections.forEach((s,i)=>{const b=document.createElement('button');b.className='eight-section';b.innerHTML=`<strong>${s.intro?'前奏':'第 '+s.number+' 个八拍'}</strong><small>${s.start.toFixed(1)}–${s.end.toFixed(1)} 秒${s.partial?' · 尾段':''}</small>`;b.onclick=()=>chooseSection(i);$('#eightSections').append(b)});
  if(save){try{localStorage.setItem(lessonKey,JSON.stringify({bpm,first}))}catch{}$('#beatNotice').textContent='八拍设置已保存。请对照音乐确认第一拍；自动结果也可手动修正。';}
  $('#countDots').replaceChildren();for(let i=1;i<=8;i++){const dot=document.createElement('button');dot.textContent=i;dot.setAttribute('aria-label','查看第 '+i+' 拍');dot.onclick=()=>{if(window.lessonBusy())return;const s=lessonSections[chosenSection??lessonSections.findIndex(s=>time>=s.start&&time<s.end)];if(!s||s.intro)return;pauseLesson();seek(Math.min(s.end-.01,s.start+(i-1)*60/Number($('#beatBpm').value)))};$('#countDots').append(dot)}
  updateLessonPosition();return true;
}
function chooseSection(index){
  if(window.lessonBusy())return toast('请先停止录像或等待导出完成');
  chosenSection=index;const s=lessonSections[index];pauseLesson();seek(s.start);
  $('#sectionInstruction').textContent=s.intro?'这是前奏，可播放观察；从第一个八拍开始分段跟练。':`第 ${s.number} 个八拍${s.partial?'（视频末尾不足八拍）':''}：先慢放看清手臂、身体方向与步伐，再开镜头录一遍。`;
  $('#recordTake').textContent=s.intro?'● 录制前奏':'● 录制当前八拍';updateLessonPosition();
}
function updateLessonPosition(){
  const active=lessonSections.findIndex(s=>time>=s.start-.001&&time<s.end),s=lessonSections[active];
  [...$('#eightSections').children].forEach((b,i)=>{b.classList.toggle('selected',i===chosenSection);b.classList.toggle('playing',i===active);b.setAttribute('aria-pressed',String(i===chosenSection))});
  const n=s&&!s.intro?Math.min(8,Math.floor((time-s.start)*Number($('#beatBpm').value)/60+1e-6)+1):0;
  if(n!==lastCount){[...$('#countDots').children].forEach((d,i)=>{d.classList.toggle('active',i===n-1);d.setAttribute('aria-pressed',String(i===n-1))});lastCount=n;if(s&&!s.intro){const p=referenceAt(time)?.keypoints;const names=[[5,7,9,'左肘'],[6,8,10,'右肘'],[11,13,15,'左膝'],[12,14,16,'右膝']];const angles=names.map(([a,b,c,name])=>{if(!p||[a,b,c].some(i=>p[i][2]<.6))return name+' 暂不清晰';const u=[p[a][0]-p[b][0],p[a][1]-p[b][1]],v=[p[c][0]-p[b][0],p[c][1]-p[b][1]],length=Math.hypot(...u)*Math.hypot(...v);return name+' '+(length?Math.round(Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/length)))*180/Math.PI)+'°':'暂不清晰')});$('#sectionInstruction').textContent='第 '+s.number+' 个八拍 · 第 '+n+' 拍参考：'+angles.join(' · ')+'。可点 1–8 逐拍查看，角度来自原视频平面。';}}
  $('#activeSection').textContent=s?(s.intro?'前奏':`第 ${s.number} 个八拍${s.partial?' · 尾段':''}`):'整段观察';
  $('#activeCount').textContent=n?`第 ${n} 拍 / 8`:'准备好，慢慢来';
  if(take)$('#reviewTimeline').style.setProperty('--review-cursor',Math.max(0,Math.min(100,(time-take.start)/take.duration*100))+'%');
}
window.lessonSync=()=>{for(const id of ['beatBpm','beatFirst','loopSection','practiceSpeed','mirrorPractice','practiceOffset','detectBeats','setFirstBeat','wholeDance'])$('#'+id).disabled=window.lessonBusy();if(lessonReference!==referenceData||lessonFile!==referenceFile||lessonKey!==beatKey())refreshLesson();updateLessonPosition()};
$('#beatBpm').onchange=$('#beatFirst').onchange=()=>{if(window.lessonBusy())return;rebuildSections()};
$('#setFirstBeat').onclick=()=>{if(window.lessonBusy())return;$('#beatFirst').value=Math.min(time,total-.01).toFixed(2);rebuildSections()};
$('#wholeDance').onclick=()=>{if(window.lessonBusy())return;chosenSection=null;$('#sectionInstruction').textContent='整段练习：按进度播放。录像最长 30 秒，结束后自动分析。';$('#recordTake').textContent='● 录制整段';updateLessonPosition()};
$('#practiceSpeed').onchange=e=>{if(window.lessonBusy()){e.target.value='1';return}ref.playbackRate=cam.playbackRate=Number(e.target.value);toast('播放速度已调整；录像会使用原速，便于对齐')};
$('#detectBeats').onclick=async()=>{
  if(window.lessonBusy())return;if(!referenceFile)return toast('请先上传参考视频，示例没有音乐可分析');
  const file=referenceFile,button=$('#detectBeats');button.disabled=true;$('#beatNotice').textContent='正在读取音乐节奏…';let ctx;
  try{ctx=new AudioContext();const audio=await ctx.decodeAudioData(await file.arrayBuffer());const samples=new Float32Array(audio.length);for(let ch=0;ch<audio.numberOfChannels;ch++){const channel=audio.getChannelData(ch);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/audio.numberOfChannels;}
    if(referenceFile!==file)return;const estimate=LM.estimateBeat(samples,audio.sampleRate);if(!estimate)throw Error('音乐节拍不够清晰，请手动输入 BPM 和第一拍');
    $('#beatBpm').value=estimate.bpm;$('#beatFirst').value=estimate.first.toFixed(2);rebuildSections();$('#beatNotice').textContent=`估计节奏 ${estimate.bpm} BPM。强拍不一定是舞蹈的第一拍，请播放确认并校正。`;
  }catch(e){$('#beatNotice').textContent='未能识别：'+(e.message||'请手动设置节拍')}finally{await ctx?.close();button.disabled=false}
};
window.tickLesson=()=>{
  if(recording&&(time>=recording.end-.025||ref.ended||performance.now()-recording.clock>recording.duration*1000+500)){finishRecording();return;}
  if(playing&&!recording&&chosenSection!==null&&$('#loopSection').checked){const s=lessonSections[chosenSection];if(time>=s.end-.015){seek(s.start);if(source==='reference')ref.play().catch(()=>{pauseLesson()});}}
};
window.lessonEnded=()=>{if(recording){finishRecording();return false}if(chosenSection!==null&&$('#loopSection').checked&&$('#studio').classList.contains('active')){const s=lessonSections[chosenSection];seek(s.start);ref.play().then(()=>{playing=true;updatePlay()}).catch(pauseLesson);return true}return false};
window.lessonNavigate=page=>{if(page!=='studio'){window.mySkeletonActive=false;cancelCountdown();}};
function cancelCountdown(){countdownToken++;counting=false;$('#countdown').hidden=true;$('#finishTake').hidden=!recording;$('#recordTake').disabled=Boolean(recording);}
function mediaType(){return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||'';}
function videoFile(blob,name){return new File([blob],name+(blob.type.includes('mp4')?'.mp4':'.webm'),{type:blob.type||'video/webm'})}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function prepareAt(t){
  if(Math.abs(ref.currentTime-t)<.02&&ref.readyState>=2)return;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clean();reject(Error('参考视频定位超时，请重试'))},6000);function clean(){clearTimeout(timer);ref.removeEventListener('seeked',done);ref.removeEventListener('error',fail)}function done(){clean();resolve()}function fail(){clean();reject(Error('参考视频无法定位'))}ref.addEventListener('seeked',done,{once:true});ref.addEventListener('error',fail,{once:true});ref.currentTime=t;});
}
$('#recordTake').onclick=async()=>{
  if(window.lessonBusy())return;
  if(source!=='reference'||!referenceData)return toast('请先上传并分析参考视频');
  if(!window.liveActive||!cam.srcObject)return toast('请先点击右上角“使用实时镜头”');
  if(!window.MediaRecorder)return toast('当前浏览器不支持录像，请使用新版 Chrome');
  const s=chosenSection===null?{start:0,end:total}:lessonSections[chosenSection];
  if(s.end-s.start<.3)return toast('这段太短，请选择其他八拍');
  pauseLesson();$('#practiceSpeed').value='1';ref.playbackRate=cam.playbackRate=1;window.mySkeletonActive=false;
  const token=++countdownToken;counting=true;$('#recordTake').disabled=true;$('#finishTake').hidden=false;
  try{
    await prepareAt(s.start);time=s.start;syncTime();
    const wait=Math.min(1000,60000/Number($('#beatBpm').value));
    for(let i=4;i>=1;i--){if(token!==countdownToken)return;$('#countdown').hidden=false;$('#countdown').textContent=i;await new Promise(resolve=>setTimeout(resolve,wait));}
    if(token!==countdownToken)return;if(!window.liveActive)throw Error('镜头已关闭，请重新开启');
    $('#countdown').hidden=true;counting=false;
    // Camera-only recording keeps the reference audio out of the analysis clip.
    const stream=new MediaStream(cam.srcObject.getVideoTracks()),recorder=new MediaRecorder(stream,{mimeType:mediaType()}),chunks=[];
    recording={recorder,stream,start:s.start,end:Math.min(s.end,s.start+30),duration:Math.min(30,s.end-s.start),clock:performance.now(),chunks};
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onerror=()=>{toast('录像失败，请重试');finishRecording(false)};
    const info=recording;
    recorder.onstop=()=>completeRecording(info);
    recorder.start(200);await ref.play();playing=true;updatePlay();
    $('.lesson-stage').classList.add('recording');$('#recordStatus').textContent='正在录像 · 到达当前段落末尾后自动停止；也可随时停止。';
    info.timer=setTimeout(()=>finishRecording(),info.duration*1000+500);
  }catch(e){if(recording)finishRecording(false);cancelCountdown();$('#recordStatus').textContent='未完成录像：'+e.message;toast(e.message)}
};
function finishRecording(analyze=true){
  if(counting){cancelCountdown();$('#recordStatus').textContent='已取消倒数，尚未录制';return;}
  const info=recording;if(!info)return;recording=null;clearTimeout(info.timer);info.analyze=analyze;info.recordedDuration=Math.min(info.duration,(performance.now()-info.clock)/1000);pauseLesson();
  $('.lesson-stage').classList.remove('recording');$('#finishTake').hidden=true;$('#recordTake').disabled=false;
  if(info.recorder.state!=='inactive')info.recorder.stop();
}
$('#finishTake').onclick=()=>finishRecording();window.stopLessonRecording=()=>finishRecording();
async function completeRecording(info){
  if(!info.chunks.length)return;const blob=new Blob(info.chunks,{type:info.recorder.mimeType});
  const name='Vidance-练习-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  take={file:videoFile(blob,name),start:info.start,duration:info.recordedDuration,name};$('#downloadTake').disabled=false;
  if(take.duration<.3||!info.analyze){$('#recordStatus').textContent='录像已保留，可下载。片段太短或已中断，未进行分析。';return;}
  if(!online){pendingTake=null;$('#recordStatus').textContent='录像已生成，请下载保存。网页未连接动作分析服务，暂不能为新录像生成纠错和三维结果。';return;}pendingTake=take;$('#recordStatus').textContent='录像完成。请确认画面中的自己，随后分析动作并生成三维骨架。';
  const metadata={url:URL.createObjectURL(take.file),duration:take.duration};
  await selectFile(take.file,'practice',metadata);
  offset=-take.start;$('#practiceOffset').value=offset.toFixed(2);$('#takeReview').hidden=false;$('#takeSummary').textContent='请确认本人，等待分析';
}
$('#downloadTake').onclick=()=>{if(take)downloadBlob(take.file,take.file.name)};
window.practicePreparing=file=>{window.mySkeletonActive=false;lastReview=null;$('#takeReview').hidden=true;for(const id of ['watchMySkeleton','exportSkeleton','downloadMyMotion','exportAnnotated'])$('#'+id).disabled=true;if(pendingTake?.file!==file){pendingTake=null;take=null;$('#downloadTake').disabled=true;}};
window.practiceCompleted=async()=>{
  if(!practiceData)return;
  if(pendingTake&&pendingTake.file===practiceFile){take=pendingTake;pendingTake=null;take.duration=Math.min(take.duration,practiceData.duration);offset=-take.start;$('#practiceOffset').value=offset.toFixed(2);buildOfflineComparison();}
  else {pendingTake=null;take={file:practiceFile,start:Math.max(0,-offset),duration:practiceData.duration,name:'Vidance-我的练习'};}
  $('#downloadTake').disabled=!take.file;$('#takeReview').hidden=false;
  const usable=practiceData.frames.some(f=>f.valid3d&&f.xyz);
  $('#watchMySkeleton').disabled=$('#exportSkeleton').disabled=!usable;$('#downloadMyMotion').disabled=false;$('#exportAnnotated').disabled=false;
  $('#recordStatus').textContent=usable?'录像分析完成，可回看标注或查看自己的三维骨架。':'录像已分析，但没有可靠三维片段；可回看录像与可见部位的比较。';
  $('#reviewNote').textContent='红色片段可点击回看。比较相近机位下的可见肢段方向；灰色包含无法判断或尚未稳定的动作。';
  seek(take.start);renderReview();
};
window.comparisonCompleted=()=>renderReview();
function renderReview(){
  if(!comparisonData||!practiceData||!take)return;lastReview=comparisonData;
  // Display in practice-video time, including unknown lead-in and missing frames.
  const runs=LM.intervals(comparisonData.frames,take.duration,offset),bar=$('#reviewTimeline');bar.replaceChildren();
  let good=0,bad=0;
  for(const run of runs){const b=document.createElement('button');b.className='review-'+run.kind;b.style.left=run.start/take.duration*100+'%';b.style.width=(run.end-run.start)/take.duration*100+'%';
    const label=run.kind==='error'?'需要调整':run.kind==='good'?'接近参照':'无法判断或待观察';b.setAttribute('aria-label',`${run.start.toFixed(1)}–${run.end.toFixed(1)} 秒 ${label}`);b.title=b.getAttribute('aria-label');
    b.onclick=()=>{if(window.lessonBusy())return;chosenSection=null;pauseLesson();seek(Math.max(0,run.start-offset));toast(label+' · 已定位，点击播放回看')};bar.append(b);
    if(run.kind==='good')good+=run.end-run.start;if(run.kind==='error')bad+=run.end-run.start;
  }
  $('#takeSummary').textContent=`接近参照 ${Math.round(good/take.duration*100)}% · 待调整 ${Math.round(bad/take.duration*100)}% · 其余待观察`;
  $('#takeReview').hidden=false;updateLessonPosition();
}
function setSkeleton(mine){
  if(window.lessonBusy())return;window.mySkeletonActive=mine;chosenSection=null;
  if(mode==='skeleton')$('[data-mode="compare"]').click();
  $('#sourceLabel').textContent=mine?'我的录像 · 估计 3D':'已分析 · 3D 参考';
  $('#referenceCaption').textContent=mine?'我的三维动作 · 低质量区间保留空缺':(referenceFile?.name||'参考舞者动作');
  if(take)seek(take.start);pauseLesson();
}
$('#watchMySkeleton').onclick=()=>setSkeleton(true);$('#watchReference').onclick=()=>setSkeleton(false);
$('#watchTake').onclick=()=>{setSkeleton(false);toast('右上角显示你的录像，点击播放同步回看；红色部位表示持续偏差')};
function modelPoints(frame){if(!frame?.valid3d||!frame.xyz)return null;return [0,7,8,10,11,12,13,14,15,16,4,5,6,1,2,3].map(i=>[frame.xyz[i][0],frame.xyz[i][1]+.9,frame.xyz[i][2]])}
window.drawMySkeleton=dt=>{const frame=practiceAt(time+offset);window.VidanceScene?.update(modelPoints(frame),modelEdges.map(([a,b])=>highlightForModel(a,b)),true,'');if(!frame?.valid3d)window.VidanceScene?.update(null,[],true,'此刻没有可靠的本人三维动作');window.VidanceScene?.render(dt)};
window.renderLiveAngles=()=>{
  if(!window.liveActive){angleChip.textContent=practiceData?'录像已分析 · 可回看标注':'开启镜头后显示关节角度';return;}
  const points=performance.now()-liveStamp<700?livePoints:null;
  function angle(a,b,c){if(!points||[a,b,c].some(i=>points[i][2]<.6))return '—';const u=[points[a][0]-points[b][0],points[a][1]-points[b][1]],v=[points[c][0]-points[b][0],points[c][1]-points[b][1]],n=Math.hypot(...u)*Math.hypot(...v);return n?Math.round(Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/n)))*180/Math.PI)+'°':'—';}
  angleChip.textContent=`左肘 ${angle(5,7,9)} · 右肘 ${angle(6,8,10)} · 左膝 ${angle(11,13,15)} · 右膝 ${angle(12,14,16)}`;
};
$('#downloadMyMotion').onclick=()=>downloadJSON(practiceData,'Vidance-my-3D-motion.json');
function paintAnnotated(ctx,video,w,h,flags){
  ctx.fillStyle='#201b2a';ctx.fillRect(0,0,w,h);const scale=Math.min(w/video.videoWidth,(h-60)/video.videoHeight),dx=(w-video.videoWidth*scale)/2,dy=0;ctx.drawImage(video,dx,dy,video.videoWidth*scale,video.videoHeight*scale);
  const frame=practiceAt(video.currentTime);if(frame?.tracked){const p=frame.keypoints;for(const [a,b]of edges){if(p[a][2]<.6||p[b][2]<.6)continue;const f=flags.find(x=>x.userJoints?.[0]===a&&x.userJoints?.[1]===b);ctx.strokeStyle=f?.status==='unavailable'?'#b5aabd':f?.alpha>.05?'#ed7783':'#89d8bb';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(dx+p[a][0]*scale,dy+p[a][1]*scale);ctx.lineTo(dx+p[b][0]*scale,dy+p[b][1]*scale);ctx.stroke();}}
  ctx.fillStyle='#eee4ff';ctx.font='16px sans-serif';ctx.fillText('Vidance · '+video.currentTime.toFixed(1)+'s · '+(LM.state(flags)==='error'?'需要调整':LM.state(flags)==='good'?'接近参照':'无法判断或待观察'),18,h-24);
}
async function exportVideo(kind){
  if(window.lessonBusy()||!practiceData||!take)return;if(!window.MediaRecorder)return toast('此浏览器不支持动画视频导出');
  if(kind==='skeleton'&&!window.VidanceScene)return toast('三维场景尚未准备好');
  const token=++exportToken,savedTime=time,savedMine=window.mySkeletonActive,video=document.createElement('video'),canvas=document.createElement('canvas');let recorder,stream,videoUrl,failed=false;
  pauseLesson();exporting=true;window.lessonExporting=true;document.body.classList.add('lesson-exporting');$('#exportStatus').textContent='正在导出，请保持页面打开；导出耗时约等于录像时长。';
  try{
    canvas.width=720;canvas.height=720;const ctx=canvas.getContext('2d'),chunks=[];
    if(kind==='annotated'){
      if(!take.file)throw Error('找不到原始录像');videoUrl=URL.createObjectURL(take.file);video.src=videoUrl;video.muted=true;video.playsInline=true;
      await new Promise((resolve,reject)=>{video.onloadeddata=resolve;video.onerror=()=>reject(Error('录像无法解码'));video.load()});await video.play();
    }
    stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mediaType(),videoBitsPerSecond:3000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(Error('浏览器未能生成视频'))});recorder.start(200);
    const start=performance.now();
    await new Promise((resolve,reject)=>{
      function draw(now){try{
        if(token!==exportToken)throw Error('导出已中断，请保持页面可见后重试');
        const t=kind==='annotated'?video.currentTime:Math.min(take.duration,(now-start)/1000),referenceTime=t-offset;
        const flags=comparisonData?frameAt(comparisonData,referenceTime)?.feedback||[]:[];
        if(kind==='annotated')paintAnnotated(ctx,video,720,720,flags);
        else{
          const f=practiceAt(t),pose=modelPoints(f);window.VidanceScene.update(pose,modelEdges.map(([a,b])=>flags.find(x=>x.id===modelPartMap[a+'-'+b])),true,pose?'':'此刻没有可靠三维动作');window.VidanceScene.render(1/30);
          ctx.fillStyle='#211e2e';ctx.fillRect(0,0,720,720);const scale=Math.min(720/rc.width,660/rc.height),w=rc.width*scale,h=rc.height*scale;ctx.drawImage(rc,(720-w)/2,(660-h)/2,w,h);
          ctx.fillStyle='#eee4ff';ctx.font='16px sans-serif';ctx.fillText(pose?'Vidance · 我的三维动作 · '+t.toFixed(1)+'s':'无法可靠重建 · '+t.toFixed(1)+'s',20,695);
        }
        $('#exportStatus').textContent=`正在导出 ${Math.min(100,Math.round(t/take.duration*100))}% · 请保持页面打开`;
        if(t>=take.duration-.04||kind==='annotated'&&video.ended){resolve();return;}requestAnimationFrame(draw);
      }catch(e){reject(e)}}requestAnimationFrame(draw);
    });
    recorder.stop();await stopped;const blob=new Blob(chunks,{type:recorder.mimeType});downloadBlob(blob,'Vidance-'+(kind==='skeleton'?'我的3D动画':'我的标注录像')+(blob.type.includes('mp4')?'.mp4':'.webm'));
    $('#exportStatus').textContent='视频已生成并下载。三维为估计结果，空缺片段不会补成正确动作。';
  }catch(e){failed=true;$('#exportStatus').textContent='未完成导出：'+e.message;}
  finally{if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());video.pause();video.removeAttribute('src');video.load();if(videoUrl)URL.revokeObjectURL(videoUrl);exporting=false;window.lessonExporting=false;window.mySkeletonActive=savedMine;time=savedTime;document.body.classList.remove('lesson-exporting');syncTime();}
}
$('#exportSkeleton').onclick=()=>exportVideo('skeleton');$('#exportAnnotated').onclick=()=>exportVideo('annotated');
window.cancelLessonActivity=()=>{cancelCountdown();finishRecording(false);exportToken++;};
window.addEventListener('beforeunload',()=>{cancelCountdown();finishRecording(false);exportToken++});
refreshLesson();

const cameraColumn=$('.user-column'),cameraToggle=$('#toggleMyCamera');
window.setCameraCollapsed=collapsed=>{if(mode==='skeleton')collapsed=false;cameraColumn.classList.toggle('camera-collapsed',collapsed);cameraToggle.setAttribute('aria-expanded',String(!collapsed));cameraToggle.setAttribute('aria-label',collapsed?'展开我的镜头':'收起我的镜头');cameraToggle.title=collapsed?'展开我的镜头':'收起我的镜头';cameraToggle.innerHTML=collapsed?'<svg><use href="#i-camera"/></svg>':'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';};
cameraToggle.onclick=()=>window.setCameraCollapsed(!cameraColumn.classList.contains('camera-collapsed'));
cameraColumn.addEventListener('click',event=>{if(mode==='skeleton'||event.target.closest('button,input,select,a'))return;window.setCameraCollapsed(true)});
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.mode==='skeleton')window.setCameraCollapsed(false)}));
$('#previewPractice').onclick=startDemo;
