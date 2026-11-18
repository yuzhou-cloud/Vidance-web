/* Prepared references travel with their data, without exposing the local API. */
const remotePreview=!['127.0.0.1','localhost',''].includes(location.hostname);
const importMotion=document.createElement('input');importMotion.type='file';importMotion.accept='.json';importMotion.hidden=true;document.body.append(importMotion);
const importButton=document.createElement('button');importButton.className='secondary';importButton.textContent='导入跨电脑练习包';importButton.onclick=()=>importMotion.click();$('#newUpload').after(importButton);
const libraryImport=importButton.cloneNode(true);libraryImport.onclick=()=>importMotion.click();$('#libraryUpload').before(libraryImport);
const exportButton=document.createElement('button');exportButton.className='secondary';exportButton.textContent='下载跨电脑练习包';$('.result-actions').append(exportButton);
exportButton.onclick=async()=>{
  if(!referenceData||!referenceFile)return toast('请先选择已分析的参考舞蹈');
  if(window.lessonBusy?.())return toast('请先结束录像或导出');
  exportButton.disabled=true;
  try{const video=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(referenceFile)});
    downloadJSON({format:'vidance-reference-v1',name:$('#referenceCaption').textContent,fileName:referenceFile.name,video,result:referenceData},'Vidance-跨电脑练习包.json');
    toast('已下载。其他电脑导入后即可查看同一份三维参考，视频不上传到网站。');
  }catch{toast('练习包未能生成，请重试')}finally{exportButton.disabled=false}
};
importMotion.onchange=async()=>{
  const file=importMotion.files[0];if(!file)return;
  try{
    if(window.lessonBusy?.())throw Error('请先结束录像或导出');if(file.size>160*1024*1024)throw Error('练习包过大');
    const pack=JSON.parse(await file.text()),r=pack.result;
    if(pack.format!=='vidance-reference-v1'||!r||!Array.isArray(r.frames)||!r.frames.length||r.frames.length>2400||!Number.isFinite(r.duration)||r.duration<=0||r.duration>30.1||!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<=0||r.height<=0)throw Error('请选择 Vidance 导出的完整练习包');
    let previous=-1;
    for(const f of r.frames){if(!Number.isFinite(f.time)||f.time<previous||f.time<0||f.time>r.duration+.1||!Array.isArray(f.keypoints)||f.keypoints.length!==17||!f.keypoints.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))||f.valid3d&&(!Array.isArray(f.xyz)||f.xyz.length!==17||!f.xyz.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))))throw Error('动作数据不完整');previous=f.time;}
    const match=/^data:(video\/(?:mp4|webm|quicktime));base64,([A-Za-z0-9+/=]+)$/.exec(pack.video||'');if(!match)throw Error('练习包缺少原视频');
    const raw=atob(match[2]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),video=new File([bytes],String(pack.fileName||'reference.mp4'),{type:match[1]});
    const d={id:crypto.randomUUID(),name:String(pack.name||'导入的舞蹈').slice(0,80),collection:'本地舞蹈库',created:Date.now(),file:video,result:r,cover:await makeCover(video)};
    await libraryTransaction('readwrite',store=>store.put(d));await loadDance(d);toast('练习包已导入，三维参考可在此电脑查看');
  }catch(e){toast('未能导入：'+e.message)}finally{importMotion.value=''}
};
if(remotePreview){
  $('#serviceBanner').classList.add('online');$('#serviceStatus').textContent='浏览器直接分析 · 无需启动本机程序；首次使用需下载姿态模型。';$('#serviceBanner a').hidden=true;
  $('#analysisProgress').textContent='选择视频后直接在浏览器分析，视频不会上传到服务器。';
  $('.prototype-tag').innerHTML='<i></i> 网页体验版';$('.profile small').textContent='三维参考 · 八拍练习';
  $('.bottom-note p').textContent='导入的练习包保存在当前浏览器，不会公开上传。';
}
