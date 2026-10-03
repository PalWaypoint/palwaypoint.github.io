import {markerStorageKey,captureStorageKey,readCompleted,readCaptures} from './wiki-logic.js?v=tools-1';
import {readTeams,validateTeams,mergeTeams,teamStorageKey} from './team-storage.js?v=team-1';
import {profileKey,loadoutKey,readProfile,readLoadout,validateProfile,validateLoadout} from './player-tools/storage.js';
import {baseStorageKey,readBlueprints,validateBlueprints,mergeBlueprints} from './base-storage.js';
export const backupFormat='palwaypoint-progress',backupVersion=1;
export const hideCompletedStorageKey='palwaypoint-hide-completed-v1';
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function createBackup(storage,now=new Date()){
  return {format:backupFormat,version:backupVersion,exportedAt:now.toISOString(),completed:[...readCompleted(storage)].sort(),captures:readCaptures(storage),teams:readTeams(storage),blueprints:readBlueprints(storage),...(readProfile(storage)?{profile:readProfile(storage)}:{}),...(readLoadout(storage)?{loadout:readLoadout(storage)}:{}),settings:{hideCompleted:storage.getItem(hideCompletedStorageKey)==='true'}};
}
export function parseBackup(text){
  if(typeof text!=='string'||text.length>8_000_000)throw Error('Choose a PalWaypoint JSON backup smaller than 8 MB.');
  let v;try{v=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Choose a PalWaypoint progress backup.');}
  if(!plain(v)||v.format!==backupFormat||v.version!==backupVersion)throw Error('This is not a supported PalWaypoint progress backup.');
  if(!Array.isArray(v.completed)||v.completed.length>25000||!v.completed.every(id=>typeof id==='string'&&id.length>0&&id.length<=512))throw Error('The backup contains invalid location progress.');
  if(!plain(v.captures)||Object.keys(v.captures).length>5000||!Object.entries(v.captures).every(([id,state])=>id.length>0&&id.length<=256&&!['__proto__','constructor','prototype'].includes(id)&&['caught','complete'].includes(state)))throw Error('The backup contains invalid Pal capture progress.');
  if(v.settings!==undefined&&(!plain(v.settings)||(own(v.settings,'hideCompleted')&&typeof v.settings.hideCompleted!=='boolean')))throw Error('The backup contains invalid settings.');
  return {format:backupFormat,version:backupVersion,exportedAt:typeof v.exportedAt==='string'?v.exportedAt:null,completed:[...new Set(v.completed)],captures:Object.fromEntries(Object.entries(v.captures)),...(own(v,'teams')?{teams:validateTeams(v.teams)}:{}),...(own(v,'blueprints')?{blueprints:validateBlueprints(v.blueprints)}:{}),...(own(v,'profile')?{profile:validateProfile(v.profile)}:{}),...(own(v,'loadout')?{loadout:validateLoadout(v.loadout)}:{}),settings:own(v.settings||{},'hideCompleted')?{hideCompleted:v.settings.hideCompleted}:{}};
}
export function planImport(storage,backup,mode='merge'){
  if(!['merge','replace'].includes(mode))throw Error('Choose merge or replace.');
  // Revalidate at the write boundary; never accept a partial/corrupt object.
  const v=parseBackup(JSON.stringify(backup));
  const completed=mode==='merge'?new Set([...readCompleted(storage),...v.completed]):new Set(v.completed);
  const captures=mode==='merge'?readCaptures(storage):{};
  for(const [id,state] of Object.entries(v.captures))captures[id]=mode==='merge'&&captures[id]==='complete'?'complete':state;
  return {...v,completed:[...completed].sort(),captures,...(own(v,'teams')?{teams:mode==='merge'?mergeTeams(readTeams(storage),v.teams):v.teams}:{}),...(own(v,'blueprints')?{blueprints:mode==='merge'?mergeBlueprints(readBlueprints(storage),v.blueprints):v.blueprints}:{}),settings:mode==='merge'?{}:v.settings};
}
export function applyImport(storage,backup,mode='merge'){
  const next=planImport(storage,backup,mode),writes=[[markerStorageKey,JSON.stringify(next.completed)],[captureStorageKey,JSON.stringify(next.captures)]];
  if(own(next.settings,'hideCompleted'))writes.push([hideCompletedStorageKey,String(next.settings.hideCompleted)]);
  if(own(next,'teams'))writes.push([teamStorageKey,JSON.stringify(next.teams)]);
  if(own(next,'profile'))writes.push([profileKey,JSON.stringify(next.profile)]);
  if(own(next,'loadout'))writes.push([loadoutKey,JSON.stringify(next.loadout)]);
  if(own(next,'blueprints'))writes.push([baseStorageKey,JSON.stringify(next.blueprints)]);
  const previous=writes.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of writes)storage.setItem(key,value);}
  catch(error){let restored=true;for(const [key,value] of previous){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{restored=false;}}throw Error(restored?'Could not save the import. Previous progress was restored.':'Browser storage failed. Some changes could not be restored; keep your backup and retry when storage is available.');}
  return next;
}
