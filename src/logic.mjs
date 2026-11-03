/** Pure game rules: pose input is independent from camera/model implementation. */
export const JOINTS=['nose','ls','rs','le','re','lw','rw','lh','rh','lk','rk','la','ra'];
export const EDGES=[['nose','ls'],['nose','rs'],['ls','rs'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['ls','lh'],['rs','rh'],['lh','rh'],['lh','lk'],['lk','la'],['rh','rk'],['rk','ra']];
export const LANDMARKS={nose:0,ls:11,rs:12,le:13,re:14,lw:15,rw:16,lh:23,rh:24,lk:25,rk:26,la:27,ra:28};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function clonePose(p){return Object.fromEntries(JOINTS.map(j=>[j,{...p[j]}]));}
export const NEUTRAL={nose:{x:.5,y:.18},ls:{x:.42,y:.32},rs:{x:.58,y:.32},le:{x:.38,y:.46},re:{x:.62,y:.46},lw:{x:.36,y:.59},rw:{x:.64,y:.59},lh:{x:.45,y:.59},rh:{x:.55,y:.59},lk:{x:.44,y:.75},rk:{x:.56,y:.75},la:{x:.43,y:.93},ra:{x:.57,y:.93}};
function pose(changes){return {...clonePose(NEUTRAL),...changes};}
export const POSES=[
  {name:'Wings out',key:'1',pose:pose({le:{x:.28,y:.33},re:{x:.72,y:.33},lw:{x:.13,y:.33},rw:{x:.87,y:.33}})},
  {name:'Reach up',key:'2',pose:pose({le:{x:.4,y:.19},re:{x:.6,y:.19},lw:{x:.38,y:.06},rw:{x:.62,y:.06}})},
  {name:'Make a star',key:'3',pose:pose({le:{x:.3,y:.24},re:{x:.7,y:.24},lw:{x:.18,y:.13},rw:{x:.82,y:.13},lk:{x:.36,y:.75},rk:{x:.64,y:.75},la:{x:.26,y:.93},ra:{x:.74,y:.93}})},
  {name:'Goal posts',key:'4',pose:pose({le:{x:.27,y:.33},re:{x:.73,y:.33},lw:{x:.27,y:.13},rw:{x:.73,y:.13}})},
  {name:'Left reach',key:'5',pose:pose({le:{x:.4,y:.19},lw:{x:.38,y:.06}})},
  {name:'Right reach',key:'6',pose:pose({re:{x:.6,y:.19},rw:{x:.62,y:.06}})},
  {name:'Left L',key:'7',pose:pose({le:{x:.4,y:.19},lw:{x:.38,y:.06},re:{x:.72,y:.33},rw:{x:.87,y:.33}})},
  {name:'Right L',key:'8',pose:pose({le:{x:.28,y:.33},lw:{x:.13,y:.33},re:{x:.6,y:.19},rw:{x:.62,y:.06}})},
  {name:"Left high, right low",key:"9",pose:pose({"le":{"x":0.4,"y":0.19},"lw":{"x":0.38,"y":0.06},"re":{"x":0.71,"y":0.5},"rw":{"x":0.84,"y":0.69}})},
  {name:"Low V",key:"0",pose:pose({"le":{"x":0.29,"y":0.5},"re":{"x":0.71,"y":0.5},"lw":{"x":0.16,"y":0.69},"rw":{"x":0.84,"y":0.69}})},
  {name:"Left diagonal",key:"z",pose:pose({"le":{"x":0.29,"y":0.22},"lw":{"x":0.16,"y":0.1}})},
  {name:"Right diagonal",key:"x",pose:pose({"re":{"x":0.71,"y":0.22},"rw":{"x":0.84,"y":0.1}})},
  {name:"Left cross reach",key:"c",pose:pose({"le":{"x":0.6,"y":0.34},"lw":{"x":0.72,"y":0.38}})},
  {name:"Right cross reach",key:"v",pose:pose({"re":{"x":0.4,"y":0.34},"rw":{"x":0.28,"y":0.38}})},
  {name:"Hands at chest",key:"b",pose:pose({"le":{"x":0.34,"y":0.49},"re":{"x":0.66,"y":0.49},"lw":{"x":0.46,"y":0.35},"rw":{"x":0.54,"y":0.35}})},
];
export function translated(p,x=0,y=0){return Object.fromEntries(JOINTS.map(j=>[j,{x:p[j].x+x,y:p[j].y+y}]));}
export function crouched(p=NEUTRAL){
  const out=clonePose(p);for(const j of ['nose','ls','rs','le','re','lw','rw'])out[j].y+=.26;
  out.lh.y+=.13;out.rh.y+=.13;out.lk.x-=.07;out.rk.x+=.07;return out;
}
export function normalizedPose(p){
  const hip=midpoint(p.lh,p.rh),shoulder=midpoint(p.ls,p.rs),scale=Math.max(distance(hip,shoulder),.02);
  return Object.fromEntries(JOINTS.map(j=>[j,{x:(p[j].x-hip.x)/scale,y:(p[j].y-hip.y)/scale}]));
}
export function matchPose(p,target){
  if(!p||!JOINTS.every(j=>p[j]&&Number.isFinite(p[j].x)&&Number.isFinite(p[j].y)))return 0;
  const a=normalizedPose(p),b=normalizedPose(target);
  const weights={le:1,re:1,lw:2,rw:2,lk:1,rk:1,la:1.4,ra:1.4};let error=0,total=0;
  for(const [j,w]of Object.entries(weights)){error+=Math.min(distance(a[j],b[j]),1.6)*w;total+=w;}
  // A correct stationary leg position must not hide a wrong arm in one-sided poses.
  const armError=(elbow,wrist)=>(distance(a[elbow],b[elbow])+2*distance(a[wrist],b[wrist]))/3;
  const worstArm=Math.max(armError('le','lw'),armError('re','rw'));
  return clamp(Math.min(1-error/total/1.15,1-worstArm/2),0,1);
}
export function pointSegmentDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;
  return distance(p,{x:a.x+t*dx,y:a.y+t*dy});
}
function cross(a,b,c){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
export function segmentDistance(a,b,c,d){
  if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0){
    const overlaps=Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));
    if(overlaps)return 0;
  }
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
export function beamCollision(p,beam,radius=.023){
  if(!p)return false;
  if(pointSegmentDistance(p.nose,beam.a,beam.b)<radius+.035)return true;
  return EDGES.some(([a,b])=>segmentDistance(p[a],p[b],beam.a,beam.b)<radius+beam.width/2);
}
export function canSave(p,target,radius=.095){return !!p&&['lw','rw'].some(j=>distance(p[j],target)<=radius);}
export function readLandmarks(landmarks){
  if(!landmarks||landmarks.length<29)return null;
  // Index names describe screen-left and screen-right after mirroring.
  const result={};for(const [name,index]of Object.entries(LANDMARKS)){
    const point=landmarks[index];if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||(point.visibility??0)<.45)return null;
    result[name]={x:1-point.x,y:point.y};
  }
  return result;
}
export function calibrationFor(p){
  const hip=midpoint(p.lh,p.rh),shoulder=midpoint(p.ls,p.rs),torso=Math.max(distance(hip,shoulder),.04);
  return {hip,scale:.27/torso,shoulderRatio:Math.max(Math.abs(p.ls.x-p.rs.x)/torso,.04),hipRatio:Math.max(Math.abs(p.lh.x-p.rh.x)/torso,.04)};
}
export function calibratedPose(p,reference){return Object.fromEntries(JOINTS.map(j=>[j,{x:.5+(p[j].x-reference.hip.x)*reference.scale,y:.59+(p[j].y-reference.hip.y)*reference.scale}]));}
export function smoothPose(previous,current,amount=.6){if(!previous)return current;return Object.fromEntries(JOINTS.map(j=>[j,{x:previous[j].x*(1-amount)+current[j].x*amount,y:previous[j].y*(1-amount)+current[j].y*amount}]));}

// Per-game challenge durations. Hard uses a common time ratio.
const HARD_TIME_RATIO = .65 / .83;
const CHALLENGE_SECONDS = {
  tetris: {easy: 5.5 * 1.25, normal: 4.6 * .60, hard: 4.6 * .60 * HARD_TIME_RATIO},
  goalkeeper: {easy: 3.1, normal: 3.1 * .46, hard: 3.1 * .46 * HARD_TIME_RATIO},
  laser: {easy: 4.6 * 1.25, normal: 4.6 * .60, hard: 4.6 * .60 * HARD_TIME_RATIO}
};

function challengeDuration(game, difficulty) {
  const durations = CHALLENGE_SECONDS[game];
  if (difficulty === 'easy') return durations.easy;
  if (difficulty === 'hard') return durations.hard;
  return durations.normal;
}

export class Session{
  constructor(game,difficulty='normal',random=Math.random){
    if(!['tetris','goalkeeper','laser'].includes(game))throw new Error('Unknown game');
    this.game=game;this.difficulty=difficulty;this.random=random;this.round=0;this.rounds=game==='tetris'?POSES.length:game==='goalkeeper'?12:10;
    this.posePool=POSES.map((_,i)=>i);
    this.score=0;this.successes=0;this.combo=0;this.bestCombo=0;this.lives=3;this.elapsed=0;this.finished=false;this.events=[];this.lastPoseIndex=-1;this.nextRound();
  }
  nextRound(){
    if(this.round>=this.rounds||this.lives<=0){this.finished=true;return;}
    this.round++;this.age=0;this.hold=0;this.bestHold=0;this.bestMatch=0;this.saved=false;this.hit=false;this.contact=0;
    this.duration = challengeDuration(this.game, this.difficulty);
    if(this.game==='tetris'){
      const choice=Math.min(this.posePool.length-1,Math.floor(this.random()*this.posePool.length));
      const [index]=this.posePool.splice(choice,1);
      this.lastPoseIndex=index;this.target=POSES[index];
    }else if(this.game==='goalkeeper'){
      this.target={x:.2+this.random()*.6,y:.15+this.random()*.47};
    }else{
      const type=(this.round-1)%3;
      this.beam=type===0?{a:{x:0,y:.34},b:{x:1,y:.34},width:.014,hint:'Duck below the beam',action:'duck'}:type===1?{a:{x:.65,y:0},b:{x:.65,y:1},width:.014,hint:'Move to your left',action:'left'}:{a:{x:.35,y:0},b:{x:.35,y:1},width:.014,hint:'Move to your right',action:'right'};
      this.warning=this.duration*.58;
    }
  }
  step(seconds,p){
    if(this.finished)return;
    const dt=clamp(seconds,0,.1);this.age+=dt;this.elapsed+=dt;
    if(this.game==='tetris'){
      this.match=matchPose(p,this.target.pose);const threshold=this.difficulty==='easy'?.73:this.difficulty==='hard'?.87:.8;
      if(this.age>=this.duration-1.4){this.hold=this.match>=threshold?this.hold+dt:0;this.bestHold=Math.max(this.bestHold,this.hold);this.bestMatch=Math.max(this.bestMatch,this.match);}
    }else if(this.game==='goalkeeper'){
      const window=this.difficulty==='easy'?.65:.45;
      if(this.age>=this.duration-window&&canSave(p,this.target,this.difficulty==='hard'?.075:.105))this.saved=true;
    }else if(this.age>=this.warning){
      this.contact=beamCollision(p,this.beam)?this.contact+dt:0;
      if(this.contact>=.12&&!this.hit){this.hit=true;this.lives--;this.events.push({type:'hit',text:'Beam contact · one shield lost'});}
    }
    if(this.age>=this.duration){
      const success=this.game==='tetris'?this.bestHold>=.35:this.game==='goalkeeper'?this.saved:!this.hit;
      if(success){this.successes++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);const points=this.game==='tetris'?Math.round(100*this.bestMatch):100;this.score+=points+Math.min(this.combo-1,4)*10;}
      else this.combo=0;
      const text=this.game==='tetris'?(success?'Shape cleared!':'Keep matching — next shape!'):this.game==='goalkeeper'?(success?'Great save!':'Goal — get the next one!'):(success?'Security cleared!':'Shield used. Keep moving.');
      this.events.push({type:success?'success':'miss',text});this.nextRound();
    }
  }
  takeEvents(){const events=this.events;this.events=[];return events;}
}
