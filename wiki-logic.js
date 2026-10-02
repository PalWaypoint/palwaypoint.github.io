export const markerStorageKey='palwaypoint-progress-v1',captureStorageKey='palwaypoint-captures-v1';
export function readCompleted(storage){try{const v=JSON.parse(storage.getItem(markerStorageKey)||'[]');return new Set(Array.isArray(v)?v.filter(s=>typeof s==='string'):[]);}catch{return new Set();}}
export function readCaptures(storage){try{const v=JSON.parse(storage.getItem(captureStorageKey)||'{}');if(!v||typeof v!=='object'||Array.isArray(v))return {};return Object.fromEntries(Object.entries(v).filter(([,s])=>s==='caught'||s==='complete'));}catch{return {};}}
export function statusLabel(category){return category==='Cave Entrance'?'Explored':category==='Fast Travel'?'Unlocked':['Watchtower','Skyland Warp Altar'].includes(category)?'Activated':category==='Bounty'?'Defeated':category==='Journals'||category.endsWith('Effigy')?'Collected':'Cleared';}
export function toggleCompleted(storage,id,done){const completed=readCompleted(storage);if(done)completed.add(id);else completed.delete(id);storage.setItem(markerStorageKey,JSON.stringify([...completed]));return completed;}
export function cycleCapture(storage,id){const captures=readCaptures(storage);const next=captures[id]==='caught'?'complete':captures[id]==='complete'?'uncaught':'caught';if(next==='uncaught')delete captures[id];else captures[id]=next;storage.setItem(captureStorageKey,JSON.stringify(captures));return next;}
const breedingEngines=new WeakMap();
function breedingEngine(breeding){
  if(breedingEngines.has(breeding))return breedingEngines.get(breeding);
  const byId=new Map(breeding.pals.map(p=>[p.id,p])),special=new Map(),winners=new Map();
  const pairKey=(a,b)=>JSON.stringify([a,b].sort());
  for(const c of breeding.combos){const key=pairKey(c.a,c.b);if(!special.has(key))special.set(key,[]);special.get(key).push(c);}
  const eligible=breeding.pals.filter(p=>p.breedChild);
  const child=(a,b)=>{
    const left=byId.get(a),right=byId.get(b);if(!left||!right)return [];
    if(a===b)return [{id:a,rule:'Same species'}];
    const recipes=special.get(pairKey(a,b));
    if(recipes)return recipes.map(c=>({id:c.c,rule:'Special pairing',gender:c.ag?`${c.a}: ${c.ag==='M'?'male':'female'} · ${c.b}: ${c.bg==='M'?'male':'female'}`:''}));
    const target=Math.floor((left.rank+right.rank+1)/2);
    if(!winners.has(target))winners.set(target,[...eligible].sort((x,y)=>Math.abs(x.rank-target)-Math.abs(y.rank-target)||((y.dup??y.rank*100)-(x.dup??x.rank*100))||x.zukanIndex-y.zukanIndex||String(x.zukanIndexSuffix).localeCompare(String(y.zukanIndexSuffix))||x.id.localeCompare(y.id))[0]);
    const winner=winners.get(target);
    return winner?[{id:winner.id,rule:'Rank pairing',target,left:left.rank,right:right.rank}]:[];
  };
  const engine={child,pairs:null};breedingEngines.set(breeding,engine);return engine;
}
export function breedChildren(breeding,a,b){return a&&b?breedingEngine(breeding).child(a,b):[];}
export function parentPairs(breeding,target){
  if(!target)return [];
  const engine=breedingEngine(breeding);
  if(!engine.pairs){
    engine.pairs=new Map();const ids=[...new Set(breeding.pals.map(p=>p.id))];
    for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++){
      for(const result of engine.child(ids[i],ids[j])){
        if(!engine.pairs.has(result.id))engine.pairs.set(result.id,[]);
        engine.pairs.get(result.id).push({a:ids[i],b:ids[j],...result});
      }
    }
  }
  return engine.pairs.get(target)||[];
}
