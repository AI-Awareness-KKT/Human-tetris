/** Shared character proportions and arena projection for all three games. */
export const BODY_VIEW=Object.freeze({width:1000,height:620,scale:.8,x:100,y:118});
export const BODY_TRANSFORM=`translate(${BODY_VIEW.x} ${BODY_VIEW.y}) scale(${BODY_VIEW.scale})`;
export function bodySpace(markup){return `<g data-avatar-space transform="${BODY_TRANSFORM}">${markup}</g>`;}
export function arenaPoint(point){return {x:BODY_VIEW.x+point.x*BODY_VIEW.width*BODY_VIEW.scale,y:BODY_VIEW.y+point.y*BODY_VIEW.height*BODY_VIEW.scale};}
export function posePoint(point){return {x:(point.x-BODY_VIEW.x)/(BODY_VIEW.width*BODY_VIEW.scale),y:(point.y-BODY_VIEW.y)/(BODY_VIEW.height*BODY_VIEW.scale)};}
export function avatarDefs(theme='tetris'){
  const palette=theme==='laser'?['#111b17','#34463a','#1b2921','#0b1510','#81907e','#4d5e4b','#253623']:
    theme==='goalkeeper'?['#19322e','#577e6a','#2c5144','#152e2a','#e3d5da','#b7a0b3','#7c6f92']:
    ['#35394f','#8072a8','#574b7c','#2e3048','#e3d5da','#b7a0b3','#7c6f92'];
  return `<defs><linearGradient id="avatar-fabric"><stop stop-color="${palette[0]}"/><stop offset=".4" stop-color="${palette[1]}"/><stop offset=".72" stop-color="${palette[2]}"/><stop offset="1" stop-color="${palette[3]}"/></linearGradient><radialGradient id="avatar-face" cx=".35" cy=".3"><stop stop-color="${palette[4]}"/><stop offset=".65" stop-color="${palette[5]}"/><stop offset="1" stop-color="${palette[6]}"/></radialGradient></defs>`;
}
export function drawAvatar(p,{silhouette=false,ghost=false,profile=0,opacity=1}={}){
  const xy=j=>({x:p[j].x*1000,y:p[j].y*620}),n=xy('nose'),ls=xy('ls'),rs=xy('rs'),lh=xy('lh'),rh=xy('rh');
  const center={x:(ls.x+rs.x)/2,y:(ls.y+rs.y)/2},hip={x:(lh.x+rh.x)/2,y:(lh.y+rh.y)/2},narrow=1-Math.max(0,Math.min(1,profile))*.55,headNarrow=1-Math.max(0,Math.min(1,profile))*.45;
  const fabric=silhouette?'#000':ghost?'#b7a0ff':'url(#avatar-fabric)',edge=silhouette?'#000':'#a4afb7';
  const face=silhouette?'#000':ghost?'#d4c4ff':'url(#avatar-face)',outline=silhouette?12:2;
  const limb=(from,to,width)=>{
    const s=xy(from),e=xy(to),d=`M${s.x} ${s.y}L${e.x} ${e.y}`;
    return `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${width*narrow+outline}" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="${fabric}" stroke-width="${width*narrow}" stroke-linecap="round"/>`;
  };
  return `<g data-avatar="${silhouette?'cutout':ghost?'target':'player'}" opacity="${ghost?.25:opacity}">
    ${limb('lh','lk',38)}${limb('rh','rk',38)}${limb('lk','la',30)}${limb('rk','ra',30)}
    ${['la','ra'].map(j=>{const foot=xy(j);return `<ellipse data-avatar-joint="${j}" cx="${foot.x+4*narrow}" cy="${foot.y+7}" rx="${24*narrow}" ry="10" fill="${silhouette?'#000':ghost?'#b7a0ff':'#172026'}" stroke="${edge}" stroke-width="${outline}"/>`;}).join('')}
    <path d="M${n.x} ${n.y+24}L${center.x} ${center.y}" stroke="${fabric}" stroke-width="${19*narrow+outline}" stroke-linecap="round"/>
    ${limb('ls','le',25)}${limb('rs','re',25)}${limb('le','lw',21)}${limb('re','rw',21)}
    <path d="M${ls.x} ${ls.y-4}C${ls.x} ${ls.y-22} ${n.x-17*narrow} ${n.y+39} ${n.x-12*narrow} ${n.y+31}
      L${n.x+12*narrow} ${n.y+31}C${n.x+17*narrow} ${n.y+39} ${rs.x} ${rs.y-22} ${rs.x} ${rs.y-4}
      L${rh.x+10*narrow} ${rh.y+10}Q${hip.x} ${hip.y+18} ${lh.x-10*narrow} ${lh.y+10}Z"
      fill="${fabric}" stroke="${edge}" stroke-width="${outline}"/>
    ${silhouette?'':`<path d="M${ls.x+5*narrow} ${ls.y+10}L${hip.x} ${hip.y-2}M${lh.x} ${lh.y-8}L${rh.x} ${rh.y-8}" fill="none" stroke="#ccd4d8" stroke-opacity=".45" stroke-width="${5*narrow}"/>`}
    ${['lw','rw'].map(j=>{const hand=xy(j);return `<ellipse data-avatar-joint="${j}" cx="${hand.x}" cy="${hand.y+2}" rx="${9*narrow}" ry="12" fill="${face}" stroke="${edge}" stroke-width="${outline}"/>`;}).join('')}
    <ellipse data-avatar-head cx="${n.x}" cy="${n.y}" rx="${23*headNarrow}" ry="29" fill="${face}" stroke="${edge}" stroke-width="${outline}"/>
    ${silhouette?'':`<path d="M${n.x-19*headNarrow} ${n.y-4}Q${n.x} ${n.y-9} ${n.x+19*headNarrow} ${n.y-4}" fill="none" stroke="#202932" stroke-width="7" stroke-linecap="round"/>`}
  </g>`;
}
