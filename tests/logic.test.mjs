import test from 'node:test';
import assert from 'node:assert/strict';
import {NEUTRAL,POSES,JOINTS,LANDMARKS,clonePose,translated,crouched,matchPose,segmentDistance,beamCollision,canSave,readLandmarks,calibrationFor,calibratedPose,Session} from '../src/logic.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function runRound(session,body){const round=session.round;for(let n=0;n<200&&session.round===round&&!session.finished;n++)session.step(.1,typeof body==='function'?body(session):body);}

test('pose matching gives a perfect match independent of translation and scale',()=>{
  const target=POSES[2].pose,p=Object.fromEntries(JOINTS.map(j=>[j,{x:target[j].x*1.4+.1,y:target[j].y*1.4-.2}]));
  near(matchPose(p,target),1);near(matchPose(target,target),1);
});
test('different target poses fall below normal match threshold',()=>{
  for(let i=0;i<POSES.length;i++)for(let j=0;j<POSES.length;j++)if(i!==j)assert.ok(matchPose(POSES[i].pose,POSES[j].pose)<.73,`${POSES[i].name} incorrectly matches ${POSES[j].name}`);
});
test('all fifteen poses keep both feet grounded and body joints inside the frame',()=>{
  assert.equal(POSES.length,15);assert.equal(new Set(POSES.map(p=>p.key)).size,15);
  for(const {pose:p} of POSES){
    near(p.la.y,NEUTRAL.la.y);near(p.ra.y,NEUTRAL.ra.y);
    near(p.lh.y,NEUTRAL.lh.y);near(p.rh.y,NEUTRAL.rh.y);
    for(const joint of JOINTS)assert.ok(p[joint].x>0&&p[joint].x<1&&p[joint].y>0&&p[joint].y<1);
    near(matchPose(p,p),1);
  }
});
test('each session includes all fifteen distinct poses exactly once',()=>{
  for(const value of [0,.2,.5,.999]){
    const s=new Session('tetris','normal',()=>value),seen=[];
    for(let i=0;i<15;i++){seen.push(s.target.name);runRound(s,x=>x.target.pose);}
    assert.equal(new Set(seen).size,15);assert.equal(s.successes,15);assert.ok(s.finished);
  }
});
test('small landmark jitter still matches every target at normal difficulty',()=>{
  for(const {pose:p} of POSES){
    const noisy=clonePose(p);
    JOINTS.forEach((j,i)=>{noisy[j].x+=i%2?.012:-.012;noisy[j].y+=i%3?.008:-.008;});
    assert.ok(matchPose(noisy,p)>=.8);
  }
});
test('invalid or missing pose input cannot earn a match',()=>{assert.equal(matchPose(null,NEUTRAL),0);const bad=clonePose(NEUTRAL);bad.lw.x=NaN;assert.equal(matchPose(bad,NEUTRAL),0);});
test('segment distance detects crossing, separated and collinear cases',()=>{
  near(segmentDistance({x:0,y:0},{x:1,y:1},{x:0,y:1},{x:1,y:0}),0);
  near(segmentDistance({x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}),1);
  near(segmentDistance({x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}),1);
});
test('a laser can intersect a limb between its joint endpoints',()=>{
  const p=clonePose(NEUTRAL),beam={a:{x:.4,y:.82},b:{x:.5,y:.82},width:.01};
  assert.ok(beamCollision(p,beam));
});
test('ducking clears the high beam; lateral movement clears vertical beams',()=>{
  const s=new Session('laser');assert.ok(beamCollision(NEUTRAL,s.beam));assert.ok(!beamCollision(crouched(),s.beam));
  s.nextRound();assert.ok(beamCollision(NEUTRAL,s.beam));assert.ok(!beamCollision(translated(NEUTRAL,-.27),s.beam));
  s.nextRound();assert.ok(!beamCollision(translated(NEUTRAL,.27),s.beam));
});
test('either wrist can save but torso contact cannot',()=>{
  assert.ok(canSave(NEUTRAL,NEUTRAL.lw));assert.ok(canSave(NEUTRAL,NEUTRAL.rw));assert.ok(!canSave(NEUTRAL,NEUTRAL.nose));
});
test('landmark conversion rejects low visibility and mirrors camera coordinates',()=>{
  const points=Array.from({length:33},()=>({x:.3,y:.4,visibility:1}));
  near(readLandmarks(points).nose.x,.7);points[LANDMARKS.la].visibility=.1;assert.equal(readLandmarks(points),null);assert.equal(readLandmarks([]),null);
});
test('fixed calibration preserves sideways movement instead of recentering every frame',()=>{
  const r=calibrationFor(NEUTRAL),first=calibratedPose(NEUTRAL,r),shifted=calibratedPose(translated(NEUTRAL,.1),r);
  near(shifted.nose.x-first.nose.x,.1);near(first.lh.y,NEUTRAL.lh.y);
});
test('Tetris requires a held match near arrival; a perfect early pose alone does not clear',()=>{
  const s=new Session('tetris','normal',()=>0),first=s.target.pose;
  while(s.age<s.duration-1.6)s.step(.1,first);
  runRound(s,POSES[2].pose);assert.equal(s.successes,0);
  runRound(s,x=>x.target.pose);assert.equal(s.successes,1);assert.ok(s.score>0);
});
test('Tetris completes fifteen walls at every speed and stops updating afterward',()=>{
  for(const difficulty of ['easy','normal','hard']){
    const s=new Session('tetris',difficulty,()=>0);
    for(let i=0;i<15;i++)runRound(s,x=>x.target.pose);
    assert.ok(s.finished);assert.equal(s.successes,15);
    const score=s.score;s.step(.1,NEUTRAL);assert.equal(s.score,score);
  }
});
test('goalkeeper saves only near arrival, not just at the beginning',()=>{
  const s=new Session('goalkeeper','normal',()=>.5),p=clonePose(NEUTRAL);p.lw={...s.target};
  s.step(.1,p);runRound(s,NEUTRAL);assert.equal(s.successes,0);
  runRound(s,x=>{const b=clonePose(NEUTRAL);b.rw={...x.target};return b;});assert.equal(s.successes,1);
});
test('goalkeeper completes twelve shots with deterministic scoring',()=>{
  const s=new Session('goalkeeper','easy',()=>.25);
  for(let i=0;i<12;i++)runRound(s,x=>{const b=clonePose(NEUTRAL);b.lw={...x.target};return b;});
  assert.ok(s.finished);assert.equal(s.successes,12);assert.equal(s.bestCombo,12);assert.equal(s.score,1580);
});
test('laser warnings do not damage shields, sustained active contact damages once per round',()=>{
  const s=new Session('laser');while(s.age<s.warning-.2)s.step(.1,NEUTRAL);assert.equal(s.lives,3);
  runRound(s,NEUTRAL);assert.equal(s.lives,2);
});
test('laser ends after three failed scans and can also complete all ten safely',()=>{
  const bad=new Session('laser');for(let i=0;i<3;i++)runRound(bad,NEUTRAL);assert.ok(bad.finished);assert.equal(bad.lives,0);
  const good=new Session('laser');for(let i=0;i<10;i++)runRound(good,x=>x.beam.action==='duck'?crouched():translated(NEUTRAL,x.beam.action==='left'?-.27:.27));
  assert.ok(good.finished);assert.equal(good.lives,3);assert.equal(good.successes,10);
});
test('Normal matches the laser passage interval and Hard is faster',()=>{
  near(new Session('tetris','easy').duration,5.5*1.25);
  near(new Session('tetris','normal').duration,new Session('laser','normal').duration);
  near(new Session('tetris','normal').duration,2.76);
  near(new Session('tetris','hard').duration,2.76*.65/.83);
  assert.ok(new Session('goalkeeper','easy').duration>new Session('goalkeeper','hard').duration);
  const s=new Session('tetris','normal',()=>0),old=s.target.name;s.nextRound();assert.notEqual(s.target.name,old);
});
