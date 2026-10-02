import {gameToPixel} from './coordinates.js';
let pending;
export function loadPalHabitats(){
  if(!pending)pending=fetch('./pal-spawns.json?v=recovery-2').then(r=>{if(!r.ok)throw Error('Habitats unavailable');return r.json();}).catch(e=>{pending=null;throw e;});
  return pending;
}
export function habitatFor(data,pal,mapName){return data?.pals?.[pal]?.maps?.[mapName==='World Tree'?'tree':'main']||null;}
export function worldPixel(x,y,config){return gameToPixel((y-158000)/459,(x+123888)/459,config.calibration);}
export function spawnMarkers(data,pal,config,time){
  const habitat=habitatFor(data,pal,config.name),groups=new Map();
  for(const p of habitat?.points||[]){
    if(p[5]!=='Undefined'&&p[5].toLowerCase()!==time)continue;
    const key=[p[0],p[1],p[2]].join(':');
    if(!groups.has(key))groups.set(key,{x:p[0],y:p[1],z:p[2],min:p[3],max:p[4],weather:new Set()});
    const g=groups.get(key);g.min=Math.min(g.min,p[3]);g.max=Math.max(g.max,p[4]);g.weather.add(p[6]);
  }
  return [...groups.entries()].map(([key,g])=>{
    const weather=g.weather.has('Undefined')?'':` · Weather: ${[...g.weather].join(', ')}`;
    return {id:`spawn:${pal}:${config.name}:${key}`,category:'Wild Pal Spawn',name:pal,detail:`Lv ${g.min}–${g.max} · ${time==='night'?'Night':'Day'}${weather}`,icon:`./icons/pals/${pal}.webp`,gameX:(g.y-158000)/459,gameY:(g.x+123888)/459,pixel:worldPixel(g.x,g.y,config),metadata:{z:g.z,underground:g.z< -10000},sourceId:'installed-game-spawn-placement'};
  });
}
