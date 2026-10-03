export const baseStorageKey='palwaypoint-blueprints-v1';
export const blueprintFormat='palwaypoint-blueprint';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safe=v=>typeof v==='string'&&v.length>0&&v.length<=256&&!['__proto__','constructor','prototype'].includes(v);
const bounded=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function newBlueprint(name='New base'){return {id:crypto.randomUUID(),name,notes:'',parts:[]};}
export function validateBlueprints(value){
 if(!Array.isArray(value)||value.length>30)throw Error('Keep up to 30 saved blueprints.');
 const ids=new Set();let total=0;
 return value.map(p=>{
  if(!object(p)||!safe(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||typeof p.notes!=='string'||p.notes.length>4000||!Array.isArray(p.parts)||p.parts.length>2000||(total+=p.parts.length)>10000)throw Error('Invalid blueprint: each plan needs a name and up to 2,000 parts (10,000 across saved plans).');
  ids.add(p.id);const partIds=new Set();
  return {id:p.id,name:p.name,notes:p.notes,parts:p.parts.map(b=>{
   if(!object(b)||!safe(b.id)||partIds.has(b.id)||!safe(b.building)||!['x','y','z'].every(k=>bounded(b[k],-500,500))||!bounded(b.rotation,0,359.99999)||(b.size!==undefined&&(!Array.isArray(b.size)||b.size.length!==3||!b.size.every(n=>bounded(n,.01,100)))))throw Error('Invalid blueprint part or position.');
   partIds.add(b.id);return {id:b.id,building:b.building,x:b.x,y:b.y,z:b.z,rotation:b.rotation,...(b.size?{size:[...b.size]}:{})};
  })};
 });
}
export function readBlueprints(storage){const raw=storage.getItem(baseStorageKey);if(raw===null)return [];let value;try{value=JSON.parse(raw);}catch{throw Error('Saved blueprints could not be read. Keep a copy before clearing site data.');}return validateBlueprints(value);}
export function writeBlueprints(storage,plans){const v=validateBlueprints(plans);storage.setItem(baseStorageKey,JSON.stringify(v));return v;}
export function mergeBlueprints(current,incoming){const out=structuredClone(current);for(const p of incoming){const same=out.find(x=>x.id===p.id);if(!same)out.push(structuredClone(p));else if(JSON.stringify(same)!==JSON.stringify(p))out.push({...structuredClone(p),id:crypto.randomUUID(),name:(p.name+' (imported)').slice(0,100)});}return validateBlueprints(out);}
export function exportBlueprint(plan){return {format:blueprintFormat,version:1,blueprint:validateBlueprints([plan])[0]};}
export function parseBlueprint(text){if(typeof text!=='string'||text.length>1_000_000)throw Error('Choose a blueprint JSON smaller than 1 MB.');let v;try{v=JSON.parse(text);}catch{throw Error('This file is not valid blueprint JSON.');}if(!object(v)||v.format!==blueprintFormat||v.version!==1)throw Error('Choose a PalWaypoint blueprint export.');return validateBlueprints([v.blueprint])[0];}
