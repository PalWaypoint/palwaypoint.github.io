export const markerStorageKey='palwaypoint-progress-v1',captureStorageKey='palwaypoint-captures-v1';
export function readCompleted(storage){try{const v=JSON.parse(storage.getItem(markerStorageKey)||'[]');return new Set(Array.isArray(v)?v.filter(s=>typeof s==='string'):[]);}catch{return new Set();}}
export function readCaptures(storage){try{const v=JSON.parse(storage.getItem(captureStorageKey)||'{}');if(!v||typeof v!=='object'||Array.isArray(v))return {};return Object.fromEntries(Object.entries(v).filter(([,s])=>s==='caught'||s==='complete'));}catch{return {};}}
export function statusLabel(category){return category==='Fast Travel'?'Unlocked':['Watchtower','Skyland Warp Altar'].includes(category)?'Activated':category==='Bounty'?'Defeated':category==='Journals'||category.endsWith('Effigy')?'Collected':'Cleared';}
export function toggleCompleted(storage,id,done){const completed=readCompleted(storage);if(done)completed.add(id);else completed.delete(id);storage.setItem(markerStorageKey,JSON.stringify([...completed]));return completed;}
export function cycleCapture(storage,id){const captures=readCaptures(storage);const next=captures[id]==='caught'?'complete':captures[id]==='complete'?'uncaught':'caught';if(next==='uncaught')delete captures[id];else captures[id]=next;storage.setItem(captureStorageKey,JSON.stringify(captures));return next;}
export function breedChildren(breeding,a,b){
  if(!a||!b)return [];
  if(!breeding.pals.some(p=>p.id===a)||!breeding.pals.some(p=>p.id===b))return [];
  if(a===b)return [{id:a,rule:'Same species'}];
  const special=breeding.combos.filter(c=>(c.a===a&&c.b===b)||(c.a===b&&c.b===a));
  if(special.length)return special.map(c=>({id:c.c,rule:'Special pairing',gender:c.ag?`${c.a}: ${c.ag==='M'?'male':'female'} · ${c.b}: ${c.bg==='M'?'male':'female'}`:''}));
  const left=breeding.pals.find(p=>p.id===a),right=breeding.pals.find(p=>p.id===b);if(!left||!right)return [];
  const target=Math.floor((left.rank+right.rank+1)/2);
  const candidates=breeding.pals.filter(p=>p.breedChild).sort((x,y)=>Math.abs(x.rank-target)-Math.abs(y.rank-target)||((y.dup??y.rank*100)-(x.dup??x.rank*100))||x.zukanIndex-y.zukanIndex||String(x.zukanIndexSuffix).localeCompare(String(y.zukanIndexSuffix))||x.id.localeCompare(y.id));
  return candidates.length?[{id:candidates[0].id,rule:'Rank pairing',target,left:left.rank,right:right.rank}]:[];
}
