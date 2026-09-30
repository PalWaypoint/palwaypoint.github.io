import {gameToPixel} from './coordinates.js';

export const markerCategories=[];
export const categoryById=new Map();

export async function loadCategories(){
  const response=await fetch('./marker-categories.json');
  if(!response.ok)throw new Error('Marker categories unavailable');
  const categories=await response.json();
  markerCategories.splice(0,markerCategories.length,...categories);
  categoryById.clear();
  for(const category of categories)categoryById.set(category.id,category);
}

export async function loadMarkers(config){
  const response=await fetch(config.markers);
  if(!response.ok)throw new Error('Marker locations unavailable');
  const records=await response.json();
  return records.map(([category,name,worldX,worldY,detail,icon,level,loot,legacyId])=>{
    const gameX=(worldY-158000)/459;
    const gameY=(worldX+123888)/459;
    const id=legacyId||`${config.name}:${category}:${worldX}:${worldY}`;
    return {id,category,name,detail,icon,level,loot,gameX,gameY,pixel:gameToPixel(gameX,gameY,config.calibration)};
  });
}
