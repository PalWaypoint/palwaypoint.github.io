import {gameToPixel} from './coordinates.js';
let pending;
export function loadPalHabitats(){
  if(!pending)pending=fetch('./pal-spawns.json?v=encounters-1').then(r=>{if(!r.ok)throw Error('Habitats unavailable');return r.json();}).catch(e=>{pending=null;throw e;});
  return pending;
}
export function habitatFor(data,pal,mapName){return data?.pals?.[pal]?.maps?.[mapName==='World Tree'?'tree':'main']||null;}
export function worldPixel(x,y,config){return gameToPixel((y-158000)/459,(x+123888)/459,config.calibration);}
export function timeMatches(rowTime,time){return time==='all'||rowTime==='Undefined'||rowTime.toLowerCase()===time;}
export function poolChances(data,poolId,time,weather='Undefined'){
  const rows=data?.pools?.[poolId]||data?.specialPools?.[poolId]||[];
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
    if(!timeMatches(p[5],time)||p[10]<=0)continue;
    const key=[p[0],p[1],p[2]].join(':');
    if(!groups.has(key))groups.set(key,{x:p[0],y:p[1],z:p[2],min:p[3],max:p[4],weather:new Set(),times:new Set()});
    const g=groups.get(key);g.min=Math.min(g.min,p[3]);g.max=Math.max(g.max,p[4]);g.weather.add(p[6]);
    for(const t of p[5]==='Undefined'?['day','night']:[p[5].toLowerCase()])g.times.add(t);
  }
  return [...groups.entries()].map(([key,g])=>{
    const weather=g.weather.has('Undefined')?'':` · Weather: ${[...g.weather].join(', ')}`;
    const timeLabel=time!=='all'?(time==='night'?'Night':'Day'):g.times.size>1?'Day & night':g.times.has('night')?'Night only':'Day only';
    return {id:`spawn:${pal}:${config.name}:${key}`,category:'Wild Pal Spawn',name:pal,detail:`Lv ${g.min}–${g.max} · ${timeLabel}${weather}`,icon:`./icons/pals/${pal}.webp`,gameX:(g.y-158000)/459,gameY:(g.x+123888)/459,pixel:worldPixel(g.x,g.y,config),metadata:{z:g.z,underground:g.z< -10000},sourceId:'installed-game-spawn-placement'};
  });
}

export function encounterAreas(data,pal,config,time){
  const areas=spawnAreas(data,pal,config,time).map(a=>({...a,kind:'Field',type:'Field'})),seen=new Set(),cache=new Map();
  const map=config.name==='World Tree'?'tree':'main';
  for(const p of data.specialPlacements||[]){
    if(p.map!==map)continue;
    const key=[p.type,p.poolId,p.worldX,p.worldY,p.worldZ].join(':');if(seen.has(key))continue;
    if(!cache.has(p.poolId))cache.set(p.poolId,poolChances(data,p.poolId,time));
    const rows=cache.get(p.poolId),times=time==='all'?['day','night']:[time];
    const chance=Math.max(...times.map(t=>rows.filter(r=>r.members.some(m=>m.palId===pal&&m.max>0)).reduce((n,r)=>n+r.chances[t],0)));
    if(!chance)continue;seen.add(key);
    const pixel=worldPixel(p.worldX,p.worldY,config),radius=8000;
    const kind=p.type==='FieldBoss'?'Alpha boss':p.type==='ImprisonmentBoss'?'Sealed realm boss':p.type==='DungeonBoss'?'Dungeon boss':'Dungeon';
    areas.push({...p,id:'encounter:'+key,kind,rows,chance,pixel,radius,radiusX:Math.abs(worldPixel(p.worldX,p.worldY+radius,config).x-pixel.x),radiusY:Math.abs(worldPixel(p.worldX+radius,p.worldY,config).y-pixel.y)});
  }
  return areas;
}
export function encounterMarkers(data,pal,config,time){
  const result=spawnMarkers(data,pal,config,time),groups=new Map();
  for(const a of encounterAreas(data,pal,config,time).filter(a=>a.type!=='Field')){
    const key=[a.worldX,a.worldY,a.worldZ].join(':');
    if(!groups.has(key))groups.set(key,{area:a,kinds:new Set(),levels:[]});
    const g=groups.get(key);g.kinds.add(a.kind);
    g.levels.push(...a.rows.filter(r=>Object.values(r.chances).some(Boolean)).flatMap(r=>r.members.filter(m=>m.palId===pal&&m.max>0).flatMap(m=>[m.levelMin,m.levelMax])));
  }
  for(const [key,g]of groups){const a=g.area;
    result.push({id:`spawn:${pal}:${config.name}:encounter:${key}`,category:'Wild Pal Spawn',palId:pal,name:pal,detail:`${[...g.kinds].join(' / ')} · Lv ${Math.min(...g.levels)}–${Math.max(...g.levels)}${a.type.startsWith('Dungeon')?' · Entrance location':''}`,icon:`./icons/pals/${pal}.webp`,gameX:(a.worldY-158000)/459,gameY:(a.worldX+123888)/459,pixel:a.pixel,metadata:{z:a.worldZ,encounterKind:a.type},sourceId:'installed-game-spawn-placement'});
  }
  return result;
}
export function palAvailability(data,pal){
  const field=new Set(),special=new Set();
  for(const [map,h]of Object.entries(data?.pals?.[pal]?.maps||{}))for(const p of h.points||[])if(p[10]>0)field.add([map,p[0],p[1],p[2]].join(':'));
  for(const p of data?.specialPlacements||[]){
    const rows=data.pools?.[p.poolId]||data.specialPools?.[p.poolId]||[];
    if(rows.some(r=>r.members.some(m=>m.palId===pal&&m.max>0)))special.add([p.map,p.worldX,p.worldY,p.worldZ].join(':'));
  }
  return {field:field.size,special:special.size};
}
