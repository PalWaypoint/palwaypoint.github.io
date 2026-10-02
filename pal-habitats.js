import {gameToPixel} from './coordinates.js';
let pending;
export function loadPalHabitats(){
  if(!pending)pending=fetch('./pal-spawns.json?v=heatmap-1').then(r=>{if(!r.ok)throw Error('Habitats unavailable');return r.json();}).catch(e=>{pending=null;throw e;});
  return pending;
}
export function habitatFor(data,pal,mapName){return data?.pals?.[pal]?.maps?.[mapName==='World Tree'?'tree':'main']||null;}
export function worldPixel(x,y,config){return gameToPixel((y-158000)/459,(x+123888)/459,config.calibration);}
export function timeMatches(rowTime,time){return time==='all'||rowTime==='Undefined'||rowTime.toLowerCase()===time;}
export function poolChances(data,poolId,time,weather='Undefined'){
  const rows=data?.pools?.[poolId]||[];
  const eligible=row=>timeMatches(row.time,time)&&(row.weather==='Undefined'||row.weather===weather);
  // Never normalize a day+night union. All mode is two independent selections.
  const times=time==='all'?['day','night']:[time];
  const totals=Object.fromEntries(times.map(t=>[t,rows.filter(r=>timeMatches(r.time,t)&&(r.weather==='Undefined'||r.weather===weather)).reduce((n,r)=>n+r.weight,0)]));
  return rows.map(row=>({...row,chances:Object.fromEntries(times.map(t=>[t,timeMatches(row.time,t)&&eligible(row)&&totals[t]>0?row.weight/totals[t]:0]))}));
}
export function spawnAreas(data,pal,config,time){
  const areas=new Map(),poolCache=new Map();
  for(const p of habitatFor(data,pal,config.name)?.points||[]){
    if(!timeMatches(p[5],time))continue;
    const id=p[11],poolId=data.placementPools?.[id];if(!poolId||areas.has(id))continue;
    if(!poolCache.has(poolId))poolCache.set(poolId,poolChances(data,poolId,time));
    const rows=poolCache.get(poolId),times=time==='all'?['day','night']:[time];
    const chance=Math.max(...times.map(t=>rows.filter(r=>r.members.some(m=>m.palId===pal&&m.max>0)).reduce((n,r)=>n+r.chances[t],0)));
    if(!chance)continue;
    const pixel=worldPixel(p[0],p[1],config),radius=data.placementRadii?.[id];
    if(!Number.isFinite(radius)||radius<=0)continue;
    areas.set(id,{id,poolId,rows,chance,pixel,worldX:p[0],worldY:p[1],worldZ:p[2],radius,
      radiusX:Math.abs(worldPixel(p[0],p[1]+radius,config).x-pixel.x),radiusY:Math.abs(worldPixel(p[0]+radius,p[1],config).y-pixel.y)});
  }
  return [...areas.values()];
}
export function spawnAreasAt(areas,pixel,padding=1){
  return areas.map(area=>({area,distance:((pixel.x-area.pixel.x)/area.radiusX)**2+((pixel.y-area.pixel.y)/area.radiusY)**2}))
    .filter(hit=>Number.isFinite(hit.distance)&&hit.distance<=padding**2).sort((a,b)=>a.distance-b.distance||a.area.id.localeCompare(b.area.id)).map(hit=>hit.area);
}
export function habitatCloud(data,pal,mapName,time){
  const h=habitatFor(data,pal,mapName);if(!h)return [];
  return time==='all'?[...new Map([...(h.day||[]),...(h.night||[])].map(p=>[p.join(':'),p])).values()]:(h[time]||[]);
}
export function spawnMarkers(data,pal,config,time){
  const habitat=habitatFor(data,pal,config.name),groups=new Map();
  for(const p of habitat?.points||[]){
    if(!timeMatches(p[5],time))continue;
    const key=[p[0],p[1],p[2]].join(':');
    if(!groups.has(key))groups.set(key,{x:p[0],y:p[1],z:p[2],min:p[3],max:p[4],weather:new Set()});
    const g=groups.get(key);g.min=Math.min(g.min,p[3]);g.max=Math.max(g.max,p[4]);g.weather.add(p[6]);
  }
  return [...groups.entries()].map(([key,g])=>{
    const weather=g.weather.has('Undefined')?'':` · Weather: ${[...g.weather].join(', ')}`;
    return {id:`spawn:${pal}:${config.name}:${key}`,category:'Wild Pal Spawn',name:pal,detail:`Lv ${g.min}–${g.max} · ${time==='all'?'Day & night':time==='night'?'Night':'Day'}${weather}`,icon:`./icons/pals/${pal}.webp`,gameX:(g.y-158000)/459,gameY:(g.x+123888)/459,pixel:worldPixel(g.x,g.y,config),metadata:{z:g.z,underground:g.z< -10000},sourceId:'installed-game-spawn-placement'};
  });
}
