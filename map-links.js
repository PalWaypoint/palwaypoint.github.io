// Shared URL rules: marker IDs identify locations, including across both maps.
export function markerViewUrl(base,map,marker,zoom=4){
  const url=new URL(base);url.hash='';url.search='';
  url.searchParams.set('map',map);url.searchParams.set('category',marker.category);
  url.searchParams.set('marker',marker.id);url.searchParams.set('zoom',String(Math.max(4,Math.min(12,Number(zoom)||4))));
  if(marker.palId)url.searchParams.set('pal',marker.palId);
  return url.href;
}
export function markerWikiLinks(marker,roster){
  const category=marker.category,links=[];
  const iconId=marker.icon?.match(/\/pals\/([^/]+)\.webp/)?.[1];
  const pal=roster.find(p=>p.id===(marker.palId||iconId)||p.name===marker.name.replace(/^Rampaging /,''))||(category==='Tower'?roster.find(p=>marker.name.includes(p.name)):null);
  if(pal&&['Alpha Pal','Predator','Sealed Realm','Wild Pal Spawn','Tower'].includes(category))links.push({href:'./wiki.html#pal/'+encodeURIComponent(pal.id),label:pal.name+' wiki'});
  if(category.endsWith('Effigy'))links.push({href:'./wiki.html#effigies',label:'Effigy guide'});
  if(marker.loot||/Treasure|Oil Rig|Fishing Magnet/.test(category))links.push({href:'./wiki.html#chest-loot/'+encodeURIComponent(marker.loot||'kind:'+category),label:'Loot tables'});
  if(category.includes('Fishing Spot'))links.push({href:'./wiki.html#fishing/'+encodeURIComponent(marker.metadata?.fishingPool||''),label:'Fishing pools'});
  if(/Merchant|Marketeer/.test(category))links.push({href:'./wiki.html#merchants',label:'Merchant inventories'});
  const items={'Ore':'CopperOre','Coal':'Coal','Sulfur':'Sulfur','Pure Quartz':'Quartz','Crude Oil':'CrudeOil','Kinship Peach':'AffectionFruit_01','Nightstar Sand':'NightStone','Paldium':'Pal_crystal_S','Soralite':'SkyIslandOre','Paloxite':'WorldTreeOre','Beautiful Flower':'Poppy','Hexolite Quartz':'RainbowCrystal','Chromite':'Chromium','Ancient Bark':'Wood_Ancient','Ancient Bone':'BeastBone_Ancient','Ancient Lava':'Lava_Ancient','Powerful Fishing Magnet':'Salvage_TreasureBoxKey02'};
  const item=items[category.replace(/ Cluster$/,'')];
  if(item)links.push({href:'./wiki.html#item/'+encodeURIComponent(item),label:'Item & uses'});
  return links;
}
