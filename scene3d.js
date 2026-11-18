import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';

const canvas=document.querySelector('#referenceCanvas');
const stage=canvas.parentElement,status=document.querySelector('#sceneStatus');
const edges=[[0,1],[1,2],[2,3],[2,4],[4,5],[5,6],[2,7],[7,8],[8,9],[0,10],[10,11],[11,12],[0,13],[13,14],[14,15]];
try {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#211e2e');scene.fog=new THREE.Fog('#211e2e',5,15);
  const camera=new THREE.PerspectiveCamera(40,1,.025,60);camera.position.set(0,1.1,4.5);
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,.95,0);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.dampingFactor=.09;controls.minDistance=1.4;controls.maxDistance=9;controls.minPolarAngle=.1;controls.maxPolarAngle=Math.PI/2-.015;controls.autoRotateSpeed=.65;controls.screenSpacePanning=true;controls.update();
  scene.add(new THREE.HemisphereLight('#eee5ff','#423450',2.7));
  const key=new THREE.DirectionalLight('#fff3ea',3.2);key.position.set(3.5,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.bias=-.001;key.shadow.normalBias=.015;scene.add(key);
  const rim=new THREE.DirectionalLight('#aaa1ff',2.4);rim.position.set(-3,2,-3);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:'#322c42',roughness:.94,metalness:.04}));floor.rotation.x=-Math.PI/2;floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(24,48,'#9f85bc','#655670');grid.position.y=-.097;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.83,.84,80),new THREE.MeshBasicMaterial({color:'#ae91d2',transparent:true,opacity:.22,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.094;scene.add(ring);
  const axes=new THREE.AxesHelper(.35);axes.position.set(-1.15,-.08,.85);axes.material.transparent=true;axes.material.opacity=.45;scene.add(axes);
  const figure=new THREE.Group();scene.add(figure);
  const jointGeometry=new THREE.SphereGeometry(1,20,14),boneGeometry=new THREE.CylinderGeometry(1,1,1,16);
  const neutral=new THREE.Color('#b08be0'),accent=new THREE.Color('#ef778e'),unknown=new THREE.Color('#9b94aa');
  const jointMaterial=new THREE.MeshStandardMaterial({color:'#d9c5f6',metalness:.22,roughness:.28});
  const joints=Array.from({length:16},(_,i)=>{const mesh=new THREE.Mesh(jointGeometry,jointMaterial.clone());mesh.scale.setScalar(i===3?.092:i===0?.047:.032);mesh.castShadow=true;figure.add(mesh);return mesh});
  const bones=edges.map(([a,b])=>{const mesh=new THREE.Mesh(boneGeometry,new THREE.MeshStandardMaterial({color:neutral,metalness:.18,roughness:.32}));mesh.castShadow=true;figure.add(mesh);return mesh});
  const points=Array.from({length:16},()=>new THREE.Vector3()),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  let disposed=false,lost=false,lastW=0,lastH=0,frames=0,since=performance.now();
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h||disposed)return;if(w!==lastW||h!==lastH){lastW=w;lastH=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}}
  const observer=new ResizeObserver(resize);observer.observe(stage);
  new MutationObserver(resize).observe(document.querySelector('#studio'),{attributes:true,attributeFilter:['class']});
  function update(pose,flags=[],show=true,message=''){
    resize();if(disposed||lost)return;
    const valid=Array.isArray(pose)&&pose.length===16&&pose.every(p=>p?.length===3&&p.every(Number.isFinite));
    figure.visible=valid&&show;status.textContent=message;status.hidden=!message;
    if(!figure.visible)return;
    pose.forEach((p,i)=>{points[i].set(...p);joints[i].position.copy(points[i]);joints[i].material.color.set('#d9c5f6')});
    edges.forEach(([a,b],i)=>{const mesh=bones[i],flag=flags[i],alpha=flag?.alpha||0;mesh.position.copy(points[a]).add(points[b]).multiplyScalar(.5);direction.copy(points[b]).sub(points[a]);const length=direction.length();mesh.visible=length>.00001;mesh.quaternion.setFromUnitVectors(up,direction.normalize());const radius=i<2?.037:.025;mesh.scale.set(radius,Math.max(length,.00001),radius);mesh.material.color.copy(neutral);if(alpha>0){mesh.material.color.lerp(flag.status==='unavailable'?unknown:accent,alpha);joints[b].material.color.copy(mesh.material.color)}});
  }
  function render(dt){if(disposed||lost||!stage.clientWidth)return;resize();controls.update(dt);renderer.render(scene,camera);frames++;const now=performance.now();if(now-since>=1000){if(document.visibilityState==='visible')canvas.dataset.renderFps=(frames*1000/(now-since)).toFixed(1);frames=0;since=now}}
  function setView(view){const positions={front:[0,1.1,4.5],left:[-4.5,1.1,0],right:[4.5,1.1,0],side:[4.5,1.1,0],perspective:[2.4,1.9,3.7]};controls.autoRotate=false;controls.target.set(0,.95,0);camera.position.set(...(positions[view]||positions.perspective));controls.update()}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;figure.visible=false;status.hidden=false;status.textContent='3D 场景暂时不可用，请刷新页面重试。'});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;status.hidden=true;resize()});
  window.VidanceScene={update,render,setView,setAutoRotate(value){controls.autoRotate=value},renderer:'Three.js WebGL2',version:THREE.REVISION};
  canvas.dataset.renderer='webgl2';canvas.setAttribute('aria-label','可旋转的 WebGL 3D 参考动作场景');
  document.querySelector('#sceneEngine').textContent='3D 空间';resize();
  window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();controls.dispose();jointGeometry.dispose();boneGeometry.dispose();joints.forEach(m=>m.material.dispose());bones.forEach(m=>m.material.dispose());renderer.dispose()},{once:true});
} catch(error) {
  canvas.dataset.renderer='unavailable';status.hidden=false;status.textContent='当前浏览器无法启动 WebGL 3D 场景，请使用支持 WebGL2 的浏览器。';console.error('Vidance WebGL initialization failed:',error);
}
