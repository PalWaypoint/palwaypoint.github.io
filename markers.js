import {gameToPixel} from './coordinates.js';

export const markerCategories = [
  {id:'fastTravel', name:'Fast travel', glyph:'F', color:'#67b8ff', defaultOn:true},
  {id:'watchtower', name:'Watchtowers', glyph:'W', color:'#9cbbff', defaultOn:true},
  {id:'tower', name:'Boss towers', glyph:'T', color:'#f69c64', defaultOn:true},
  {id:'alpha', name:'Alpha Pals', glyph:'A', color:'#f37c89', defaultOn:true},
  {id:'bounty', name:'Bounty targets', glyph:'B', color:'#e5a36e'},
  {id:'oilRig', name:'Oil rigs', glyph:'O', color:'#fa7b5c'},
  {id:'dungeon', name:'Dungeons', glyph:'D', color:'#bb9afa', defaultOn:true},
  {id:'journal', name:'Journals', glyph:'J', color:'#f6d377'},
  {id:'npc', name:'NPCs', glyph:'N', color:'#8edac5'},
  {id:'effigy', name:'Effigies', glyph:'E', color:'#a9e07d'},
  {id:'schematic', name:'Schematics', glyph:'S', color:'#d1b18a'},
  {id:'quest', name:'Quest locations', glyph:'Q', color:'#f2add3'}
];

export const categoryById = new Map(markerCategories.map(category=>[category.id,category]));

export async function loadMarkers(config){
  const response=await fetch(config.markers);
  if(!response.ok)throw new Error('Marker locations unavailable');
  const records=await response.json();
  return records.map(([category,name,worldX,worldY,worldZ,detail],id)=>{
    const gameX=(worldY-158000)/459;
    const gameY=(worldX+123888)/459;
    return {id,category,name,detail,worldZ,gameX,gameY,pixel:gameToPixel(gameX,gameY,config.calibration)};
  });
}
