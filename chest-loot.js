let pending;
export function loadLootTables(){
  return pending??=fetch('./loot-tables.json?v=loot-2').then(r=>{if(!r.ok)throw Error('Loot tables unavailable');return r.json();}).catch(e=>{pending=null;throw e;});
}
export function poolIdsFor(marker,tips){
  const tip=tips?.tips?.[marker.loot];
  return marker.metadata?.pools?.map(p=>p.id)||tip?.pools?.map(p=>p.id)|| (marker.loot?.startsWith('game:')?[marker.loot.slice(5)]:[]);
}
export function lootPoolsFor(catalog,key,tips){
  if(!key)return catalog.pools;
  if(key.startsWith('kind:'))return catalog.pools.filter(p=>p.kind.includes(key.slice(5)));
  const ids=tips?.tips?.[key]?.pools?.map(p=>p.id)||[key.replace(/^game:/,'')];
  const exact=catalog.pools.filter(p=>ids.includes(p.id));if(exact.length)return exact;
  const prefix=key.match(/^(?:chest|oilrig|treasureMap):(.+)$/)?.[1];
  return prefix?catalog.pools.filter(p=>p.id.toLowerCase().startsWith(prefix.toLowerCase())):[];
}
