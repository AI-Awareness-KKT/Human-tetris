import {Session,JOINTS,EDGES,NEUTRAL,POSES,clonePose,translated,crouched,clamp,readLandmarks,calibrationFor,calibratedPose,smoothPose} from './logic.mjs?v=20261103-5';
import {drawAvatar,avatarDefs,bodySpace,BODY_TRANSFORM,posePoint} from './avatar.mjs?v=20261102-3';
import {setupFullscreenCamera} from './fullscreen.mjs?v=20261103-3';

const $=id=>document.getElementById(id),game=document.documentElement.dataset.game;
const config={tetris:{title:'Human Tetris',accent:'#b7a0ff',rounds:POSES.length},goalkeeper:{title:'Virtual Goalkeeper',accent:'#9cdeaa',rounds:12},laser:{title:'Laser Escape',accent:'#ffaf77',rounds:10}}[game];
let mode='demo',phase='ready',session=null,body=clonePose(NEUTRAL),reference=null,rawBody=null,lastBodyAt=0,calibrationHold=0;
let stream=null,tracker=null,trackerPromise=null,cameraLoading=false,cameraRunning=false,cameraGeneration=0;
let lastVideo=-1,lastDetection=0,lastTick=performance.now(),lastRender=0,countdown=0,toastUntil=0,lossAge=0,statusText='';
let demoPose=0,demoX=0,glove={x:.5,y:.42},pointerGloves=false,keys=new Set(),poseQuality=0;
const scene=$('scene'),video=$('video');
const color=config.accent;
document.querySelector(`[data-nav="${game}"]`).classList.add('active');
$('third-label').textContent=game==='laser'?'SHIELDS':'STREAK';$('third').textContent=game==='laser'?'3':'0';

function status(text,error=false){if(statusText!==text){$('tracking-status').textContent=text;statusText=text;}$('tracking-status').classList.toggle('error',error);}
function announce(text,bad=false){$('event-toast').textContent=text;$('event-toast').classList.toggle('bad',bad);$('event-toast').hidden=false;toastUntil=performance.now()+1900;}
function bestKey(){return `kinetic-v2-${game}-${mode}-${$('difficulty').value}`;}
function readBest(){try{return Number(localStorage.getItem(bestKey()))||0;}catch{return 0;}}
function updateBest(){const best=readBest();$('best').textContent=String(best).padStart(4,'0');$('best-mode').textContent=`${mode==='demo'?'KEYBOARD DEMO':'CAMERA'} · ${$('difficulty').value.toUpperCase()}`;}
function saveBest(){try{if(session.score>readBest())localStorage.setItem(bestKey(),String(session.score));}catch{}updateBest();}
function trackingReady(){return cameraRunning&&reference&&rawBody&&performance.now()-lastBodyAt<650;}
function setOverlay(title,copy,label,note=''){
  $('overlay').hidden=false;$('overlay-title').textContent=title;$('overlay-copy').textContent=copy;$('start').textContent=label;$('overlay-note').textContent=note;
  $('start').disabled=mode==='camera'&&!trackingReady();
}
function resetReady(){
  session=null;phase='ready';countdown=0;keys.clear();demoX=0;lossAge=0;$('score').textContent='0000';$('round').textContent='—';$('third').textContent=game==='laser'?'3':'0';$('elapsed').textContent='00:00';
  $('pause').disabled=true;$('pause').textContent='Ⅱ Pause';$('restart').disabled=true;$('difficulty').disabled=false;
  setOverlay(mode==='demo'?'Ready to play?':'Set up your camera',mode==='demo'?'Try the keyboard controls below, then start a round.':'Stand upright with your head, hands and feet visible. Hold still to calibrate. ',mode==='demo'?'Try keyboard demo':'Start camera game ↗',mode==='demo'?'This mode uses a virtual body. No camera or AI.':'Calibration will enable the Start button.');
  updateBest();
}
function startGame(){
  if(mode==='camera'&&!trackingReady()){announce('Keep your whole body in view before starting.',true);return;}
  session=new Session(game,$('difficulty').value);phase='countdown';countdown=3;lossAge=0;keys.clear();
  $('difficulty').disabled=true;$('restart').disabled=false;$('pause').disabled=true;
  setOverlay('3','Get ready. Your round starts in a moment.','Starting…','');$('start').disabled=true;
}
function pauseGame(reason='Take a breath. Resume when you are ready.'){
  if(!['playing','countdown'].includes(phase))return;
  phase='paused';keys.clear();$('pause').textContent='▶ Resume';$('pause').disabled=false;
  setOverlay('Game paused',reason,'Resume round ↗',mode==='camera'?'Return to full view before resuming.':'Your progress is preserved.');
}
function resumeGame(){
  if(mode==='camera'&&!trackingReady()){announce('Step back into view to resume.',true);return;}
  phase='countdown';countdown=2;lossAge=0;$('pause').disabled=true;$('start').disabled=true;
  setOverlay('2','Back in position. Get ready.','Resuming…','');$('start').disabled=true;
}
function finishGame(){
  phase='results';saveBest();$('pause').disabled=true;$('difficulty').disabled=false;
  const noun=game==='tetris'?'walls cleared':game==='goalkeeper'?'shots saved':'scans cleared';
  setOverlay(`${session.score} points. Nicely moved.`,`${session.successes} / ${session.rounds} ${noun} · best streak ${session.bestCombo}${game==='laser'&&session.lives<=0?' · all shields used':''}`,'Play again ↗',mode==='demo'?'Keyboard demo result. Try the camera for real body play.':'Camera-play result. No video was saved.');
}
$('start').addEventListener('click',()=>{if(phase==='paused')resumeGame();else if(['ready','results'].includes(phase))startGame();});
$('pause').addEventListener('click',()=>phase==='paused'?resumeGame():pauseGame());
$('restart').addEventListener('click',()=>{pauseGame();$('restart-dialog').showModal();});
for(const id of ['cancel-restart','keep-playing'])$(id).addEventListener('click',()=>$('restart-dialog').close());
$('confirm-restart').addEventListener('click',()=>{$('restart-dialog').close();resetReady();});
$('difficulty').addEventListener('change',()=>{if(phase==='results')resetReady();updateBest();});
function openHelp(){pauseGame('Help is open. Close it, then resume when ready.');$('help-dialog').showModal();}
$('help').addEventListener('click',openHelp);$('learn').addEventListener('click',openHelp);$('close-help').addEventListener('click',()=>$('help-dialog').close());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
setupFullscreenCamera({
  layout: document.querySelector('.play-layout'),
  stage: $('stage'),
  video,
  cameraButton: $('camera'),
  toggleButton: $('fullscreen'),
  announce
});

function demoControls(){
  const box=$('touch-controls');box.replaceChildren();
  if(game==='tetris'){
    POSES.forEach((p,i)=>{const b=document.createElement('button');b.textContent=`${p.key} · ${p.name}`;b.dataset.pose=i;b.addEventListener('click',()=>{if(mode!=='demo')return;demoPose=i;pointerGloves=false;updateDemoButtons();});box.append(b);});
  }else{
    [['ArrowLeft','← Left'],['ArrowRight','Right →'],...(game==='laser'?[['ArrowDown','↓ Duck']]:[['ArrowUp','↑ Up'],['ArrowDown','↓ Down']])].forEach(([key,label])=>{
      const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',label);b.addEventListener('pointerdown',event=>{if(mode!=='demo')return;keys.add(key);pointerGloves=false;b.setPointerCapture(event.pointerId);event.preventDefault();});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(key));box.append(b);
    });
    if(game==='laser'){const b=document.createElement('button');b.textContent='Center';b.addEventListener('click',()=>{demoX=0;keys.clear();});box.append(b);}
  }updateDemoButtons();
}
function updateDemoButtons(){document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('active',Number(b.dataset.pose)===demoPose));}
document.addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)||$('help-dialog').open||$('restart-dialog').open)return;
  if(event.key==='Escape'){if(phase==='playing')pauseGame();return;}
  if(mode!=='demo')return;
  const key={a:'ArrowLeft',d:'ArrowRight',s:'ArrowDown',w:'ArrowUp'}[event.key.toLowerCase()]||event.key;
  const poseIndex=game==='tetris'?POSES.findIndex(p=>p.key===key.toLowerCase()):-1;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)||poseIndex>=0)event.preventDefault();else return;
  keys.add(key);pointerGloves=false;if(poseIndex>=0){demoPose=poseIndex;updateDemoButtons();}
});
document.addEventListener('keyup',event=>{keys.delete(({a:'ArrowLeft',d:'ArrowRight',s:'ArrowDown',w:'ArrowUp'}[event.key.toLowerCase()]||event.key));});
scene.addEventListener('pointermove',event=>{
  if(game!=='goalkeeper'||mode!=='demo')return;const r=scene.getBoundingClientRect();glove={x:clamp((event.clientX-r.left)/r.width,.1,.9),y:clamp((event.clientY-r.top)/r.height,.08,.8)};pointerGloves=true;
});
function updateDemo(dt){
  if(game==='tetris'){body=smoothPose(body,POSES[demoPose].pose,.25);return;}
  if(game==='goalkeeper'){
    if(!pointerGloves){glove.x=clamp(glove.x+((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*.65,.1,.9);glove.y=clamp(glove.y+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*dt*.65,.08,.8);}
    const p=clonePose(NEUTRAL);p.lw={x:glove.x-.065,y:glove.y};p.rw={x:glove.x+.065,y:glove.y};
    p.le={x:(p.lw.x+p.ls.x)/2-.035,y:(p.lw.y+p.ls.y)/2+.05};p.re={x:(p.rw.x+p.rs.x)/2+.035,y:(p.rw.y+p.rs.y)/2+.05};body=smoothPose(body,p,.35);
  }else{
    demoX=clamp(demoX+((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*.55,-.3,.3);
    body=smoothPose(body,translated(keys.has('ArrowDown')?crouched():NEUTRAL,demoX),.3);
  }
}

async function loadModel(){
  if(tracker)return tracker;
  if(!trackerPromise){trackerPromise=(async()=>{
    const base='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    const {FilesetResolver,PoseLandmarker}=await import(`${base}/vision_bundle.mjs`);
    const vision=await FilesetResolver.forVisionTasks(`${base}/wasm`);
    const modelAssetPath='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
    const common={runningMode:'VIDEO',numPoses:1,outputSegmentationMasks:false,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55};
    try{return await PoseLandmarker.createFromOptions(vision,{...common,baseOptions:{modelAssetPath,delegate:'GPU'}});}
    catch{return await PoseLandmarker.createFromOptions(vision,{...common,baseOptions:{modelAssetPath,delegate:'CPU'}});}
  })().then(model=>{tracker=model;return model;}).catch(error=>{trackerPromise=null;throw error;});}
  return trackerPromise;
}
function stopCamera(message='Camera off. The keyboard demo is ready.'){
  cameraGeneration++;cameraLoading=false;cameraRunning=false;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;
  video.srcObject=null;rawBody=null;reference=null;calibrationHold=0;lastBodyAt=0;lastVideo=-1;mode='demo';body=clonePose(NEUTRAL);
  $('camera-placeholder').hidden=false;$('live-pill').hidden=true;$('camera-skeleton').replaceChildren();$('calibration-bar').style.width='0%';
  $('camera').innerHTML='Open camera';$('mode-label').innerHTML='<i></i> KEYBOARD DEMO · NO CAMERA';$('mode-label').classList.remove('camera-mode');
  $('touch-controls').hidden=false;$('recalibrate').disabled=true;status(message);resetReady();
}
$('camera').addEventListener('click',async()=>{
  if(cameraLoading||cameraRunning){stopCamera();return;}
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status('Camera needs HTTPS or localhost. Use the keyboard demo here.',true);return;}
  const generation=++cameraGeneration;cameraLoading=true;pauseGame();$('camera').textContent='Cancel camera setup ×';status('Allow camera permission. Audio is not requested.');
  let obtained=null;
  try{
    obtained=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
    if(generation!==cameraGeneration){obtained.getTracks().forEach(t=>t.stop());return;}
    stream=obtained;video.srcObject=stream;await video.play();if(generation!==cameraGeneration)return;
    $('camera-placeholder').hidden=true;status('Loading body-tracking model. First use may take a moment…');await loadModel();if(generation!==cameraGeneration)return;
    cameraRunning=true;cameraLoading=false;mode='camera';reference=null;rawBody=null;calibrationHold=0;lastDetection=0;lastVideo=-1;body=clonePose(NEUTRAL);
    $('camera').innerHTML='Stop camera';$('live-pill').hidden=false;$('mode-label').innerHTML='<i></i> CAMERA MODE · FULL-BODY TRACKING';$('mode-label').classList.add('camera-mode');$('touch-controls').hidden=true;$('recalibrate').disabled=false;
    for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{if(cameraRunning)stopCamera('Camera disconnected. Keyboard demo is ready.');},{once:true});
    resetReady();status('Stand upright, arms relaxed, with your whole body visible.');
  }catch(error){
    if(generation!==cameraGeneration){obtained?.getTracks().forEach(t=>t.stop());return;}
    const message=({NotAllowedError:'Camera permission denied. Allow it in browser settings and retry.',NotFoundError:'No camera found. Connect one or use the keyboard demo.',NotReadableError:'Camera is busy. Close other camera apps and retry.'})[error.name]||'Body tracking could not load. Check Internet access and retry.';
    stopCamera(message);status(message,true);
  }
});
$('recalibrate').addEventListener('click',()=>{pauseGame('Recalibrating. Stand upright with your whole body visible.');reference=null;calibrationHold=0;$('calibration-bar').style.width='0%';$('start').disabled=true;});
function detectBody(now){
  if(!cameraRunning||video.readyState<2||video.currentTime===lastVideo||now-lastDetection<65)return;
  const dt=Math.min((now-lastDetection)/1000,.12);lastDetection=now;lastVideo=video.currentTime;
  try{
    const result=tracker.detectForVideo(video,now);rawBody=readLandmarks(result.landmarks?.[0]);
    if(rawBody){
      lastBodyAt=now;
      if(!reference){
        const inFrame=JOINTS.every(j=>rawBody[j].x>.025&&rawBody[j].x<.975&&rawBody[j].y>.025&&rawBody[j].y<.975);
        calibrationHold=inFrame?calibrationHold+dt:0;$('calibration-bar').style.width=`${Math.min(calibrationHold/2,1)*100}%`;
        status(inFrame?'Hold a relaxed standing pose. Calibrating…':'Step back until your head, hands and feet fit in the frame.');
        if(calibrationHold>=2){reference=calibrationFor(rawBody);status('Body tracking ready. Start or resume your round.');}
      }
      if(reference){body=smoothPose(body,calibratedPose(rawBody,reference),.6);status('Body tracked. Move comfortably within the frame.');}
      if($('show-skeleton').checked)$('camera-skeleton').innerHTML=drawBody(rawBody,color,5,false,true);else $('camera-skeleton').replaceChildren();
    }else{
      calibrationHold=0;if(!reference)$('calibration-bar').style.width='0%';$('camera-skeleton').replaceChildren();status('Tracking lost. Keep your head, hands and feet visible.');
    }
    if(['ready','paused','results'].includes(phase))$('start').disabled=!trackingReady();
  }catch{stopCamera('Tracking stopped. Enable the camera again, or play the keyboard demo.');}
}

function point(p){return `${(clamp(p.x,-.4,1.4)*1000).toFixed(1)},${(clamp(p.y,-.4,1.4)*620).toFixed(1)}`;}
function drawBody(p,stroke=color,width=16,ghost=false,preview=false){
  const lines=EDGES.map(([a,b])=>`<path d="M${point(p[a])} L${point(p[b])}"/>`).join('');
  const circles=JOINTS.filter(j=>j!=='nose').map(j=>`<circle cx="${p[j].x*1000}" cy="${p[j].y*620}" r="${preview?5:width*.36}" fill="${stroke}" stroke="none"/>`).join('');
  return `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${ghost?'stroke-dasharray="10 12" opacity=".4"':''}>${lines}<circle cx="${p.nose.x*1000}" cy="${p.nose.y*620}" r="${preview?12:23}" fill="${ghost?'none':stroke}" stroke-width="${preview?3:5}"/>${circles}</g>`;
}
function text(x,y,content,fill='#d2dfed',size=17,anchor='middle',extra=''){return `<text x="${x}" y="${y}" fill="${fill}" font-family="Space Grotesk, monospace" font-size="${size}" text-anchor="${anchor}" ${extra}>${content}</text>`;}
function defs(){return `<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#1a2032"/><stop offset="1" stop-color="#0d1521"/></linearGradient><radialGradient id="field"><stop stop-color="#294f47"/><stop offset="1" stop-color="#0c2629"/></radialGradient><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#34435b" stroke-opacity=".28"/></pattern><pattern id="net" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#b9d9da" stroke-opacity=".16"/></pattern><pattern id="blocks" width="64" height="64" patternUnits="userSpaceOnUse"><rect x="5" y="5" width="54" height="54" rx="5" fill="#b7a0ff" fill-opacity=".09" stroke="#b7a0ff" stroke-opacity=".25"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="4"/></filter></defs>`;}
function drawTetris(){
  const target=session?.target||POSES[0],progress=session?clamp(session.age/session.duration,0,1):.45;
  const scale=.55+progress*.45;
  const avatarTransform=BODY_TRANSFORM;
  const targetBody=`<g transform="${avatarTransform}">${drawAvatar(target.pose,{silhouette:true})}</g>`;
  return `<rect width="1000" height="620" fill="url(#sky)"/><rect width="1000" height="620" fill="url(#grid)"/><path d="M0 620 260 300H740L1000 620M0 510H1000M0 440H1000M0 380H1000" stroke="#8870b0" stroke-opacity=".2" fill="none"/>
  <defs><mask id="wall-hole"><rect width="1000" height="620" fill="white"/>${targetBody}</mask></defs>
  <g transform="translate(${500*(1-scale)} ${310*(1-scale)}) scale(${scale})" opacity="${.2+progress*.55}"><rect x="35" y="35" width="930" height="555" rx="18" fill="url(#blocks)" stroke="${color}" stroke-width="3" mask="url(#wall-hole)"/></g>
  <ellipse cx="${100+(body.la.x+body.ra.x)*400}" cy="589" rx="74" ry="9" fill="#080b16" opacity=".5"/>
  ${bodySpace(drawAvatar(target.pose,{ghost:true})+drawAvatar(body))}
  <rect x="45" y="80" width="185" height="82" rx="9" fill="#1b2235" stroke="#8270b066"/>${text(62,105,'MATCH THE SHAPE',color,10,'start')}${text(62,138,target.name,'#efebff',19,'start')}
  ${text(850,98,session?`${Math.round((session.match||0)*100)}%`:`${POSES.length} WALLS`,color,27)}${text(850,120,session?'POSE MATCH':'ONE YOU','#8699b4',9)}
  <rect x="805" y="138" width="95" height="5" rx="2" fill="#35415b"/><rect x="805" y="138" width="${95*(session?.match||0)}" height="5" rx="2" fill="${color}"/>
  ${session?text(500,565,session.age>session.duration-1.4?'HOLD YOUR SHAPE':`WALL ARRIVES IN ${Math.max(0,session.duration-session.age).toFixed(1)}s`,color,14):''}`;
}
function drawGoalkeeper(){
  const target=session?.target||{x:.73,y:.32},p=session?clamp(session.age/session.duration,0,1):.55,ease=p*p;
  const x=500+(target.x*1000-500)*ease,y=150+(target.y*620-150)*ease,r=10+28*ease;
  const ball=`<g transform="translate(${x} ${y}) rotate(${p*240})"><circle r="${r}" fill="#f1f1dd" stroke="#09271c" stroke-width="2"/><path d="M0 ${-r*.5} ${r*.48} ${-r*.15} ${r*.3} ${r*.42} ${-r*.3} ${r*.42} ${-r*.48} ${-r*.15}Z" fill="#23302e"/></g>`;
  return `<rect width="1000" height="620" fill="url(#field)"/><path d="M0 100H1000M0 580H1000" stroke="#94b8a0" stroke-opacity=".13" stroke-width="25"/><path d="M20 620 240 80H760L980 620" stroke="#5f9d83" fill="none" stroke-opacity=".2"/>
  <rect x="120" y="85" width="760" height="465" fill="url(#net)" stroke="#e3ead4" stroke-width="7" rx="3"/><path d="M120 550H880M140 570H860" stroke="#d1dfbe" stroke-opacity=".4" fill="none"/>
  <circle cx="${target.x*1000}" cy="${target.y*620}" r="42" fill="#a5f5b30d" stroke="${color}" stroke-dasharray="6 8" stroke-width="2"/><path d="M${target.x*1000-13} ${target.y*620}h26m-13-13v26" stroke="${color}" opacity=".6"/>
  ${drawBody(body,'#8aaca3',10,false)}${['lw','rw'].map(j=>`<g transform="translate(${body[j].x*1000} ${body[j].y*620})"><rect x="-24" y="-26" width="48" height="52" rx="14" fill="${session?.saved?'#f9e09d':color}" stroke="#e9ffe8" stroke-width="3"/><path d="M-13-6h26M-13 3h26" stroke="#385346" stroke-width="2"/></g>`).join('')}${ball}
  ${text(500,65,'KINETIC STADIUM','#b6cfb4',11)}${text(500,585,session?(session.saved?'SAVE LOCKED IN':p>.8?'GLOVES TO THE TARGET!':'READ THE SHOT · FOLLOW THE TARGET'):'12 SHOTS. MAKE THEM COUNT.',color,14)}`;
}
function drawLaser(){
  const beam=session?.beam||{a:{x:0,y:.34},b:{x:1,y:.34},hint:'Duck below the beam',action:'duck'},active=session&&session.age>=session.warning;
  const beamColor=active?'#ff675b':'#edc28b';
  return `<rect width="1000" height="620" fill="#111923"/><path d="M0 0 260 135V435L0 620M1000 0 740 135V435L1000 620M260 135H740V435H260Z" stroke="#34404b" stroke-width="2" fill="#19212a"/><path d="M100 0 310 135M900 0 690 135M0 520H1000M0 565H1000M200 620 360 435M800 620 640 435M500 620V435" stroke="#3e464c" fill="none" opacity=".6"/><rect x="385" y="185" width="230" height="250" rx="18" fill="#151b22" stroke="#4b4e51" stroke-width="3"/><circle cx="500" cy="305" r="65" fill="none" stroke="#665746" stroke-width="8"/><path d="M500 253V357M448 305H552" stroke="#665746" stroke-width="8"/><rect x="125" y="80" width="20" height="390" fill="#232b34"/><rect x="855" y="80" width="20" height="390" fill="#232b34"/>
  ${drawBody(body,'#d6e1e8',13)}
  <path d="M${point(beam.a)} L${point(beam.b)}" stroke="${beamColor}" stroke-width="${active?14:3}" opacity="${active?.25:.6}" ${active?'filter="url(#glow)"':'stroke-dasharray="15 15"'}/><path d="M${point(beam.a)} L${point(beam.b)}" stroke="${beamColor}" stroke-width="${active?4:2}" ${active?'':'stroke-dasharray="15 15"'}/>
  <rect x="332" y="45" width="336" height="56" rx="7" fill="#252b30" stroke="${beamColor}" stroke-opacity=".5"/>${text(500,68,active?'BEAM ACTIVE':'SECURITY SCAN INCOMING',beamColor,10)}${text(500,89,beam.hint,'#f0ddc5',16)}
  ${text(500,580,session?`${active?'STAY CLEAR':'FIRING IN'} ${Math.max(0,(active?session.duration:session.warning)-session.age).toFixed(1)}s`:'NO JUMPING. JUST GOOD TIMING.',beamColor,13)}`;
}
function render(){scene.innerHTML=defs()+avatarDefs(game)+(game==='tetris'?drawTetris():game==='goalkeeper'?drawGoalkeeper():drawLaser());}
function updateMetrics(){
  if(!session)return;$('score').textContent=String(session.score).padStart(4,'0');$('round').textContent=`${Math.min(session.round,session.rounds)}/${session.rounds}`;$('third').textContent=game==='laser'?session.lives:session.combo;
  const seconds=Math.floor(session.elapsed);$('elapsed').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  $('round-hint').textContent=mode==='demo'?(game==='tetris'?'DEMO: choose a pose below, or use 1–9, 0, Z X C V B':game==='goalkeeper'?'DEMO: arrow keys or pointer move your gloves':'DEMO: ← / → move · hold ↓ to duck'):(game==='tetris'?'Copy the silhouette. Hold as the wall arrives.':game==='goalkeeper'?'Move either wrist to the target as the ball arrives.':session.beam?.hint||'Move clear of the beam.');
}
function tick(now){
  const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;
  if(!document.hidden){
    if(mode==='demo')updateDemo(dt);else detectBody(now);
    if(mode==='camera'&&['playing','countdown'].includes(phase)){
      lossAge=trackingReady()?0:lossAge+dt;
      if(lossAge>.7)pauseGame('Tracking paused. Step back until your whole body is visible, then Resume.');
    }
    if(phase==='countdown'){
      if(mode==='demo'||trackingReady())countdown-=dt;
      $('overlay-title').textContent=String(Math.max(1,Math.ceil(countdown)));
      if(countdown<=0){phase='playing';$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ Pause';}
    }else if(phase==='playing'&&(mode==='demo'||trackingReady())){
      session.step(dt,body);for(const event of session.takeEvents())announce(event.text,['hit','miss'].includes(event.type));
      updateMetrics();if(session.finished)finishGame();
    }
    if(now-lastRender>32){render();lastRender=now;}
    if(toastUntil&&now>toastUntil){$('event-toast').hidden=true;toastUntil=0;}
  }
  requestAnimationFrame(tick);
}
window.addEventListener('blur',()=>{keys.clear();pauseGame('The game paused while the window was inactive.');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pauseGame('The game paused while this tab was hidden.');}});
window.addEventListener('pagehide',()=>{cameraGeneration++;stream?.getTracks().forEach(t=>t.stop());tracker?.close();});
demoControls();updateBest();render();requestAnimationFrame(tick);
