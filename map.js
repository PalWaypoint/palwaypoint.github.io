import {pixelToGame, screenToPixel} from './coordinates.js';
import {mapConfigs} from './map-config.js?v=recovery-2';
import {TerrainElevation} from './elevation.js';
import {loadMarkers,loadCategories,markerCategories,categoryById,initCaptureTracker,regionAtPixel} from './markers.js?v=paldeck-controls-1';
import {loadPalHabitats,worldPixel,encounterMarkers,encounterAreas,spawnAreasAt,palAvailability} from './pal-habitats.js?v=encounters-1';
import {palRoster} from './markers.js?v=paldeck-controls-1';
import {markerViewUrl,markerWikiLinks} from './map-links.js';
import {loadLootTables,poolIdsFor} from './chest-loot.js?v=loot-2';
import {createBackup} from './progress-backup.js?v=team-1';

const captureTracker=initCaptureTracker(selectHabitat);

const canvas = document.querySelector('#map');
const context = canvas.getContext('2d');
const coordX = document.querySelector('#coord-x');
const coordY = document.querySelector('#coord-y');
const coordZ = document.querySelector('#coord-z');
const elevationNote = document.querySelector('#elevation-note');
const teleportCommand = document.querySelector('#tp-command');
const teleportNote = document.querySelector('#teleport-note');
const copyTeleport = document.querySelector('#copy-tp');
const unpinButton = document.querySelector('#unpin');
const layersToggle=document.querySelector('#layers-toggle');
const layersPanel=document.querySelector('#layers-panel');
const mapBody=document.querySelector('#map-body');
const sidebarBackdrop=document.querySelector('#sidebar-backdrop');
const mobileSiteMenu=document.querySelector('#mobile-site-menu');
const mobileMenuButton=mobileSiteMenu.querySelector('summary');
mobileSiteMenu.addEventListener('toggle',()=>mobileMenuButton.setAttribute('aria-expanded',String(mobileSiteMenu.open)));
document.addEventListener('pointerdown',event=>{if(mobileSiteMenu.open&&!mobileSiteMenu.contains(event.target))mobileSiteMenu.open=false;});
mobileSiteMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();mobileSiteMenu.open=false;mobileMenuButton.focus();}});
mobileSiteMenu.querySelector('nav').addEventListener('click',event=>{if(event.target.closest('a'))mobileSiteMenu.open=false;});
document.querySelector('#download-map-backup').addEventListener('click',()=>{
  const status=document.querySelector('#map-backup-status');status.hidden=false;
  try{
    const backup=createBackup(localStorage),url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`palwaypoint-progress-${backup.exportedAt.slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Backup download started.';
  }catch{status.textContent='Could not create a backup. Open Restore progress to try again.';}
});
const mapButtons=[...document.querySelectorAll('.map-switcher button')];
const layerList=document.querySelector('#layer-list');
const layerStatus=document.querySelector('#layer-status');
const markerSearch=document.querySelector('#marker-search');
const markerTooltip=document.querySelector('#marker-tooltip');
const regionBanner=document.querySelector('#region-banner');
let regionCursor=null;
const markerDetail=document.querySelector('#marker-detail');
const markerLoot=document.querySelector('#marker-loot');
const markerProgressControl=document.querySelector('#marker-progress-control');
const markerProgressCheckbox=document.querySelector('#marker-progress-checkbox');
const markerProgressLabel=document.querySelector('#marker-progress-label');
const markerProgressNote=document.querySelector('#marker-progress-note');
const hideCompletedCheckbox=document.querySelector('#hide-completed');
const progressStorageKey='palwaypoint-progress-v1';
const hideCompletedStorageKey='palwaypoint-hide-completed-v1';
function readProgress(){try{const value=JSON.parse(localStorage.getItem(progressStorageKey)||'[]');return new Set(Array.isArray(value)?value:[]);}catch{return new Set();}}
const completedMarkers=readProgress();
let hideCompleted=false;
try{hideCompleted=localStorage.getItem(hideCompletedStorageKey)==='true';}catch{}
hideCompletedCheckbox.checked=hideCompleted;
const activeCategories=new Set(['Fast Travel']);
const expandedGroups=new Set(['Collectibles']);
const iconCache=new Map();
let markers=[],visibleMarkers=[],markerHits=[],selectedMarker=null,hoveredMarker=null,searchTerm='';
let habitatData=null,selectedPal=null,selectedPalName='',habitatTime='day',habitatGeneration=0,habitatMarkers=[];
let habitatAreas=[],heatSurface=null,spawnPinned=false,spawnViewKey='';
const spawnDetail=document.querySelector('#spawn-detail'),spawnDetailContent=document.querySelector('#spawn-detail-content');
const markerSpawns=document.querySelector('#marker-spawns'),heatmapToggle=document.querySelector('#habitat-heatmap');
const spawnPinsToggle=document.querySelector('#habitat-pins');
const palNames=new Map(palRoster.map(p=>[p.id,p.name]));
let chestTipsPromise=null;
let teleportText='';
let copyResetTimer=0;
const teleportClearanceCm=150;
const coordinateSource = document.querySelector('#coordinate-source');
const zoomLabel = document.querySelector('#zoom-label');
const loading = document.querySelector('#loading');
const error = document.querySelector('#map-error');
const controls = [...document.querySelectorAll('.map-controls button')];
const camera = {x:0,y:0,scale:1};
const image = new Image();
const pointers = new Map();
let width=0, height=0, fitScale=1, loaded=false, cursor=null, lastPinch=null, frame=0;
let pinnedPosition=null,pressStart=null,pressMoved=false;
const linkedParams=new URLSearchParams(location.search);
let pendingLinkedMarker=linkedParams.get('marker');
let currentMap=mapConfigs[linkedParams.get('map')]||mapConfigs.islands,mapGeneration=0;
let linkedLootPool=linkedParams.get('loot');
if(linkedParams.get('category')){activeCategories.clear();activeCategories.add(linkedParams.get('category'));}
const categoriesReady=loadCategories();
let elevation = new TerrainElevation(()=>{if(loaded)updateReadout();},currentMap.terrain);

function scheduleDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function position(event){const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
function onMap(point){return point.x>=0&&point.y>=0&&point.x<=image.naturalWidth&&point.y<=image.naturalHeight;}
function decimal(value){return (Math.abs(value)<.005?0:value).toFixed(2);}
function isTrackable(marker){return marker.category==='Dungeon'||!!categoryById.get(marker.category)?.trackable;}
function progressLabel(category){
  if(category==='Cave Entrance')return 'Explored';
  if(category==='Fast Travel')return 'Unlocked';
  if(['Watchtower','Skyland Warp Altar'].includes(category))return 'Activated';
  if(category==='Bounty')return 'Defeated';
  if(category==='Journals'||category.endsWith('Effigy'))return 'Collected';
  return 'Cleared';
}
function saveProgress(){
  try{localStorage.setItem(progressStorageKey,JSON.stringify([...completedMarkers]));markerProgressNote.textContent='Saved on this device.';}
  catch{markerProgressNote.textContent='Could not save progress in this browser.';}
}
function markerMatches(marker){
  if(!activeCategories.has(marker.category))return false;
  if(linkedLootPool&&marker.loot!=='game:'+linkedLootPool&&!marker.metadata?.pools?.some(p=>p.id===linkedLootPool))return false;
  if(hideCompleted&&completedMarkers.has(marker.id))return false;
  if(!searchTerm)return true;
  const category=categoryById.get(marker.category);
  return `${marker.name} ${marker.detail} ${category?.name} ${category?.group}`.toLowerCase().includes(searchTerm);
}
function habitatVisible(){return !!selectedPal&&!document.querySelector('#pals-view').hidden;}
function refreshVisibleMarkers(){document.querySelector('#habitat-controls').hidden=!habitatVisible();visibleMarkers=habitatVisible()?[...habitatMarkers]:markers.filter(markerMatches);updateLayerSummary();scheduleDraw();}
for(const view of ['locations','pals'])document.querySelector(`#${view}-tab`).addEventListener('click',()=>{clearMarkerSelection();refreshVisibleMarkers();});
document.querySelector('#pals-tab').addEventListener('click',()=>{loadPalHabitats().then(data=>{habitatData=data;captureTracker.setAvailability(new Map(palRoster.map(p=>[p.id,palAvailability(data,p.id)])));}).catch(()=>{});});
function refreshHabitat(){
  habitatMarkers=[];habitatAreas=[];heatSurface=null;hideSpawnDetails();
  document.querySelector('#browse-spawns').disabled=true;
  if(selectedPal&&habitatData){
    categoryById.set('Wild Pal Spawn',{name:'Wild Pal Spawn',icon:`./icons/pals/${selectedPal}.webp`,trackable:false});
    habitatMarkers=encounterMarkers(habitatData,selectedPal,currentMap,habitatTime).map(m=>({...m,name:selectedPalName}));
    habitatAreas=encounterAreas(habitatData,selectedPal,currentMap,habitatTime);
    document.querySelector('#browse-spawns').disabled=!habitatAreas.length;
    buildHeatSurface();
    const timeLabel=habitatTime==='all'?'day/night':habitatTime;
    const field=habitatMarkers.filter(m=>!m.metadata?.encounterKind).length,special=habitatMarkers.length-field,anywhere=palAvailability(habitatData,selectedPal);
    document.querySelector('#habitat-status').textContent=habitatMarkers.length?`${field.toLocaleString('en-US')} field · ${special.toLocaleString('en-US')} boss/dungeon`:anywhere.field||anywhere.special?`No ${timeLabel} encounters on ${currentMap.name}. Try another time or map.`:'No wild spawns recorded. Paldeck shading is not a confirmed spawn.';
  }
  refreshVisibleMarkers();
}
async function selectHabitat(id,name=id){
  selectedPal=id;selectedPalName=name;const generation=++habitatGeneration;
  document.querySelector('#habitat-controls').hidden=false;
  document.querySelector('#habitat-name').textContent=name;
  document.querySelector('#habitat-profile').href=`./wiki.html#pal/${encodeURIComponent(id)}`;
  document.querySelector('#habitat-status').textContent='Loading habitat…';
  if(window.matchMedia('(max-width:700px)').matches)toggleLayers(false);
  habitatMarkers=[];clearMarkerSelection();refreshVisibleMarkers();
  try{const [data]=await Promise.all([loadPalHabitats(),categoriesReady]);if(generation!==habitatGeneration)return;habitatData=data;refreshHabitat();}
  catch{if(generation===habitatGeneration)document.querySelector('#habitat-status').textContent='Habitat could not load. Choose this Pal again to retry.';}
}
for(const button of document.querySelectorAll('[data-habitat-time]'))button.addEventListener('click',()=>{
  habitatTime=button.dataset.habitatTime;for(const b of document.querySelectorAll('[data-habitat-time]'))b.setAttribute('aria-pressed',String(b===button));clearMarkerSelection();refreshHabitat();
});
document.querySelector('#clear-habitat').addEventListener('click',()=>{selectedPal=null;habitatGeneration++;habitatMarkers=[];habitatAreas=[];heatSurface=null;document.querySelector('#habitat-controls').hidden=true;clearMarkerSelection();refreshVisibleMarkers();});
heatmapToggle.addEventListener('change',scheduleDraw);
spawnPinsToggle.addEventListener('change',scheduleDraw);
function buildHeatSurface(){
  // Rasterize once in map coordinates. Panning/zooming cannot move the kernels.
  const size=1024,ratio=size/4096,density=new Float32Array(size*size);
  // Smooth confirmed field placements only. Paldeck clouds can contain species
  // with no spawn rows; dungeon entrances and boss points are shown as pins.
  const smoothing=Math.min(35000,(currentMap.terrain.maxX-currentMap.terrain.minX)*.025);
  const samples=habitatAreas.filter(a=>a.type==='Field').map(a=>({...a,radiusX:Math.abs(currentMap.calibration.pixelsPerX*smoothing/459),radiusY:Math.abs(currentMap.calibration.pixelsPerY*smoothing/459)}));
  for(const area of samples){
    const x=area.pixel.x*ratio,y=area.pixel.y*ratio,rx=Math.max(1,area.radiusX*ratio),ry=Math.max(1,area.radiusY*ratio);
    const left=Math.max(0,Math.floor(x-rx)),right=Math.min(size-1,Math.ceil(x+rx)),top=Math.max(0,Math.floor(y-ry)),bottom=Math.min(size-1,Math.ceil(y+ry));
    for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){
      const d=((px-x)/rx)**2+((py-y)/ry)**2;
      if(d<1)density[py*size+px]+=area.chance*(1-d)**2;
    }
  }
  let max=0;for(const v of density)max=Math.max(max,v);if(!max)return;
  heatSurface=document.createElement('canvas');heatSurface.width=size;heatSurface.height=size;
  const ctx=heatSurface.getContext('2d'),pixels=ctx.createImageData(size,size);
  for(let i=0;i<density.length;i++)if(density[i]>0){
    const t=Math.sqrt(density[i]/max),warm=Math.max(0,(t-.45)/.55),offset=i*4;
    pixels.data[offset]=Math.round(45+210*warm);pixels.data[offset+1]=Math.round(214-24*warm);pixels.data[offset+2]=Math.round(188-130*warm);pixels.data[offset+3]=Math.round(195*Math.min(1,t*2));
  }
  ctx.putImageData(pixels,0,0);
}
function drawHabitat(){
  if(habitatVisible()&&heatmapToggle.checked&&heatSurface)context.drawImage(heatSurface,camera.x,camera.y,4096*camera.scale,4096*camera.scale);
}
function hideSpawnDetails(){spawnPinned=false;spawnViewKey='';spawnDetail.hidden=true;}
function chanceText(value){if(!value)return '—';return value<.0005?'<0.05%':(value*100).toLocaleString('en-US',{maximumFractionDigits:1})+'%';}
function renderSpawnGroups(target,areas,nearby=false,browse=false){
  target.replaceChildren();if(!areas.length)return;
  const selector=document.createElement('select');selector.setAttribute('aria-label','Encounter area');
  const locationCounts=new Map();
  for(const area of areas){const key=[area.kind,area.worldX,area.worldY,area.worldZ].join(':');locationCounts.set(key,(locationCounts.get(key)||0)+1);}
  const locationIndexes=new Map();
  for(const area of areas){
    const key=[area.kind,area.worldX,area.worldY,area.worldZ].join(':'),index=(locationIndexes.get(key)||0)+1;locationIndexes.set(key,index);
    const option=document.createElement('option');option.value=area.id;
    option.textContent=`${area.kind||'Field'}${locationCounts.get(key)>1?' pool '+index+'/'+locationCounts.get(key):''} · X ${Math.round((area.worldY-158000)/459)}, Y ${Math.round((area.worldX+123888)/459)} · Z ${Math.round(area.worldZ/100)} m`;selector.append(option);
  }
  selector.hidden=areas.length===1;target.append(selector);
  const body=document.createElement('div');target.append(body);
  const render=()=>{
    body.replaceChildren();const area=areas.find(a=>a.id===selector.value)||areas[0];
    if(areas.length===1){const coordinates=document.createElement('p');coordinates.className='spawn-meta';coordinates.textContent=selector.options[0].textContent;body.append(coordinates);}
    const location=document.createElement('p');location.className='spawn-meta';location.textContent=`${nearby?'Nearby location · ':''}${area.kind||'Field'} · ${habitatTime==='all'?'Day & night':habitatTime==='night'?'Night':'Day'}${area.type?.startsWith('Dungeon')?' · Entrance location; possible dungeon encounter pool':area.type==='Field'?' · '+Math.round(area.radius/100)+' m spawn radius':''}${area.worldZ< -10000?' · Underground':''}`;body.append(location);
    const table=document.createElement('table');table.className='spawn-table';
    const thead=document.createElement('thead'),heading=document.createElement('tr');
    for(const text of ['Encounter group',...(habitatTime==='all'?['Day','Night']:['Chance'])]){const th=document.createElement('th');th.scope='col';th.textContent=text;heading.append(th);}thead.append(heading);table.append(thead);
    const tbody=document.createElement('tbody');
    for(const row of [...area.rows].sort((a,b)=>Math.max(...Object.values(b.chances))-Math.max(...Object.values(a.chances)))){
      const tr=document.createElement('tr');tr.classList.toggle('spawn-selected',row.members.some(m=>m.palId===selectedPal));
      if(!Object.values(row.chances).some(Boolean))tr.classList.add('spawn-inactive');
      const members=document.createElement('td');
      if(!row.members.length)members.textContent='No character entry';
      for(const member of row.members){const line=document.createElement('div');line.className='spawn-member';
        if(member.palId){const a=document.createElement('a');a.href=`./wiki.html#pal/${encodeURIComponent(member.palId)}`;a.textContent=palNames.get(member.palId)||member.name;line.append(a);}
        else{const label=document.createElement('span');label.textContent=member.name+(member.type==='NPC'?' (NPC)':'');line.append(label);}
        const quantity=document.createElement('span');quantity.textContent=` ×${member.min===member.max?member.min:member.min+'–'+member.max}`;line.append(quantity);
        const levels=document.createElement('small');levels.textContent=`Lv ${member.levelMin===member.levelMax?member.levelMin:member.levelMin+'–'+member.levelMax}`;line.append(levels);members.append(line);
      }
      if(row.time!=='Undefined'||row.weather!=='Undefined'){const condition=document.createElement('small');condition.className='spawn-condition';condition.textContent=[row.time==='Undefined'?'Any time':row.time,row.weather==='Undefined'?'':row.weather].filter(Boolean).join(' · ');members.append(condition);}
      tr.append(members);for(const t of habitatTime==='all'?['day','night']:[habitatTime]){const td=document.createElement('td');td.textContent=chanceText(row.chances[t]);tr.append(td);}tbody.append(tr);
    }
    table.append(tbody);body.append(table);
    const note=document.createElement('p');note.className='spawn-note';note.textContent='Chance of selecting this encounter group from the eligible game-table rows. Members in one row spawn together. — means unavailable for that time. Actual encounters also depend on spawn limits and world conditions.'+(area.type?.startsWith('Dungeon')?' Dungeon chances apply when this pool is chosen; they are not combined across rooms or other dungeon pools.':'');body.append(note);
    if(areas.length>1){const overlap=document.createElement('p');overlap.className='spawn-note';overlap.textContent=`${areas.length} spawn areas ${browse?'available for this Pal':'overlap here'}. Choose an area above; their chances are kept separate.`;body.append(overlap);}
  };
  selector.addEventListener('change',render);render();
}
function showSpawnAt(pixel,pin=false){
  if(!habitatVisible()||selectedMarker||spawnPinned&&!pin)return false;
  let areas=spawnAreasAt(habitatAreas,pixel);const nearby=!areas.length;
  if(nearby)areas=spawnAreasAt(habitatAreas,pixel,2.5);
  if(!areas.length){if(!spawnPinned)hideSpawnDetails();return false;}
  const key=String(nearby)+areas.map(a=>a.id).join(':');
  if(key!==spawnViewKey){renderSpawnGroups(spawnDetailContent,areas,nearby);spawnViewKey=key;}
  spawnDetail.hidden=false;spawnPinned=pin;markerTooltip.hidden=true;return true;
}
document.querySelector('#spawn-detail-close').addEventListener('click',hideSpawnDetails);
document.querySelector('#browse-spawns').addEventListener('click',()=>{
  if(!habitatAreas.length)return;clearMarkerSelection();renderSpawnGroups(spawnDetailContent,habitatAreas,false,true);spawnPinned=true;spawnDetail.hidden=false;
});
spawnDetail.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();hideSpawnDetails();canvas.focus();}});
function markerIcon(path){
  if(!path)return null;
  if(!iconCache.has(path)){
    const img=new Image();img.onload=scheduleDraw;img.onerror=scheduleDraw;img.src=path;iconCache.set(path,img);
  }
  const img=iconCache.get(path);
  return img.complete&&img.naturalWidth?img:null;
}
function updateLayerControls(){
  const counts=new Map(markerCategories.map(category=>[category.id,0]));
  const doneCounts=new Map(markerCategories.map(category=>[category.id,0]));
  for(const marker of markers){
    counts.set(marker.category,(counts.get(marker.category)||0)+1);
    if(completedMarkers.has(marker.id))doneCounts.set(marker.category,(doneCounts.get(marker.category)||0)+1);
  }
  layerList.replaceChildren();
  const groups=new Map();
  for(const category of markerCategories){
    if(!counts.get(category.id))continue;
    if(!groups.has(category.group))groups.set(category.group,[]);
    groups.get(category.group).push(category);
  }
  for(const [group,categories] of groups){
    const groupMatches=!searchTerm||group.toLowerCase().includes(searchTerm);
    const matchingCategories=categories.filter(category=>groupMatches||category.name.toLowerCase().includes(searchTerm)||markers.some(marker=>marker.category===category.id&&`${marker.name} ${marker.detail}`.toLowerCase().includes(searchTerm)));
    if(!matchingCategories.length)continue;
    const section=document.createElement('section');section.className='layer-group';
    const header=document.createElement('div');header.className='layer-group-heading';
    const expand=document.createElement('button');expand.type='button';expand.className='layer-group-expand';expand.textContent=group;
    const open=expandedGroups.has(group)||!!searchTerm;expand.setAttribute('aria-expanded',String(open));
    const body=document.createElement('div');body.className='layer-group-body';body.hidden=!open;
    expand.addEventListener('click',()=>{body.hidden=!body.hidden;expand.setAttribute('aria-expanded',String(!body.hidden));body.hidden?expandedGroups.delete(group):expandedGroups.add(group);});
    const count=document.createElement('span');count.className='layer-group-count';
    const groupTotal=categories.reduce((sum,category)=>sum+counts.get(category.id),0);
    const groupDone=categories.reduce((sum,category)=>sum+doneCounts.get(category.id),0);
    count.textContent=group==='Collectibles'?`${groupDone.toLocaleString('en-US')}/${groupTotal.toLocaleString('en-US')}`:groupTotal.toLocaleString('en-US');
    const all=document.createElement('input');all.type='checkbox';all.className='layer-group-toggle';all.checked=categories.every(category=>activeCategories.has(category.id));all.indeterminate=!all.checked&&categories.some(category=>activeCategories.has(category.id));all.setAttribute('aria-label',`Show all ${group} markers`);
    all.addEventListener('change',()=>{for(const category of categories)all.checked?activeCategories.add(category.id):activeCategories.delete(category.id);updateLayerControls();refreshVisibleMarkers();});
    header.append(expand,count,all);section.append(header,body);
    for(const category of matchingCategories){
      const row=document.createElement('label');row.className='layer-row';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=activeCategories.has(category.id);checkbox.setAttribute('aria-label',category.name);
      checkbox.addEventListener('change',()=>{checkbox.checked?activeCategories.add(category.id):activeCategories.delete(category.id);updateLayerControls();refreshVisibleMarkers();});
      const icon=document.createElement('img');icon.className='layer-icon';icon.src=category.icon;icon.alt='';icon.loading='lazy';
      const name=document.createElement('span');name.className='layer-name';name.textContent=category.name;
      const itemCount=document.createElement('span');itemCount.className='layer-count';itemCount.textContent=(category.trackable||category.id==='Dungeon')?`${doneCounts.get(category.id).toLocaleString('en-US')}/${counts.get(category.id).toLocaleString('en-US')}`:counts.get(category.id).toLocaleString('en-US');
      row.append(checkbox,icon,name,itemCount);body.append(row);
    }
    layerList.append(section);
  }
  updateLayerSummary();
}
function updateLayerSummary(){
  const count=visibleMarkers.filter(m=>m.category!=='Wild Pal Spawn').length;
  document.querySelector('#layers-count').textContent=(habitatVisible()?habitatMarkers.length:count).toLocaleString('en-US');
  layerStatus.textContent=markers.length?`${count.toLocaleString('en-US')} of ${markers.length.toLocaleString('en-US')} ${currentMap.name} locations shown. Click a pin for coordinates.`:'No locations loaded.';
}
function drawMarkers(){
  markerHits=[];
  if(!visibleMarkers.length)return;
  const cells=new Map(),spawnPins=[],cellSize=42,margin=cellSize+24;
  for(const marker of visibleMarkers){
    const x=camera.x+marker.pixel.x*camera.scale,y=camera.y+marker.pixel.y*camera.scale;
    // Keep the grid fixed to the map so dragging cannot reshuffle clusters.
    // The margin includes every member of a cluster whose center is on screen.
    if(x< -margin||x>width+margin||y< -margin||y>height+margin)continue;
    if(marker.category==='Wild Pal Spawn'){if(spawnPinsToggle.checked)spawnPins.push({x,y,marker});continue;}
    const key=`${Math.floor(marker.pixel.x*camera.scale/cellSize)},${Math.floor(marker.pixel.y*camera.scale/cellSize)}`;
    let cell=cells.get(key);if(!cell){cell={x:0,y:0,markers:[]};cells.set(key,cell);}
    cell.x+=marker.pixel.x;cell.y+=marker.pixel.y;cell.markers.push(marker);
  }
  context.save();context.textAlign='center';context.textBaseline='middle';context.font='bold 11px Segoe UI,Arial,sans-serif';
  // Small fixed-position spawn pins keep dense heatmaps readable at all zooms.
  for(const {x,y,marker}of spawnPins){const kind=marker.metadata?.encounterKind;context.beginPath();context.arc(x,y,kind?5:2.5,0,Math.PI*2);context.fillStyle=kind?(kind.startsWith('Dungeon')?'#68e7cb':'#ffdf74'):'#a78beb';context.fill();context.lineWidth=kind?2:1;context.strokeStyle='#edf8ff';context.stroke();markerHits.push({x,y,r:kind?10:7,markers:[marker]});}
  for(const cell of cells.values()){
    const count=cell.markers.length,x=camera.x+cell.x/count*camera.scale,y=camera.y+cell.y/count*camera.scale,cluster=count>1,r=cluster?16:14;
    if(x< -24||x>width+24||y< -24||y>height+24)continue;
    const category=categoryById.get(cell.markers[0].category);
    const completed=!cluster&&completedMarkers.has(cell.markers[0].id);
    context.globalAlpha=completed ? .55 : 1;
    if(cluster){
      context.shadowColor='#07151c';context.shadowBlur=5;
      context.beginPath();context.arc(x,y,r,0,Math.PI*2);
      context.fillStyle='#112833';context.fill();
      context.shadowBlur=0;context.strokeStyle='#c7e5e7';context.lineWidth=2;context.stroke();
      context.fillStyle='#eef8f4';context.fillText(count>99?'99+':String(count),x,y+.5);
    }
    else{
      const icon=markerIcon(cell.markers[0].icon||category.icon);
      if(icon)context.drawImage(icon,x-12,y-12,24,24);
      else{context.fillStyle='#eef8f4';context.fillText('•',x,y+.5);}
      if(completed){context.globalAlpha=1;context.beginPath();context.arc(x+10,y+10,8,0,Math.PI*2);context.fillStyle='#68e7cb';context.fill();context.fillStyle='#10242c';context.font='bold 12px Segoe UI,Arial,sans-serif';context.fillText('✓',x+10,y+10);context.font='bold 11px Segoe UI,Arial,sans-serif';}
    }
    context.globalAlpha=1;
    markerHits.push({x,y,r:r+5,markers:cell.markers});
  }
  context.restore();
}
function markerHit(point){for(let i=markerHits.length-1;i>=0;i--){const hit=markerHits[i];if(Math.hypot(point.x-hit.x,point.y-hit.y)<=hit.r)return hit;}return null;}
function markerDisplayCategory(marker){const kind=marker.metadata?.encounterKind;return kind?(kind.startsWith('Dungeon')?'Dungeon encounter':'Boss encounter'):categoryById.get(marker.category).name;}
function showMarkerTooltip(point){
  const hit=markerHit(point);
  hoveredMarker=hit?.markers.length===1?hit.markers[0]:null;
  if(!hit){markerTooltip.hidden=true;return;}
  markerTooltip.replaceChildren();
  const title=document.createElement('strong');title.textContent=hit.markers.length===1?hit.markers[0].name:`${hit.markers.length} locations`;
  const subtitle=document.createElement('span');subtitle.textContent=hit.markers.length===1?markerDisplayCategory(hit.markers[0]):'Click to zoom in';
  markerTooltip.append(title,subtitle);markerTooltip.hidden=false;
  markerTooltip.style.left=`${Math.min(point.x+17,width-190)}px`;
  markerTooltip.style.top=`${Math.max(8,point.y-54)}px`;
}
function loadChestTips(){
  return chestTipsPromise??=fetch('./chest-tips.json?v=recovery-2').then(response=>{
    if(!response.ok)throw new Error('Chest loot unavailable');
    return response.json();
  });
}
function chestNote(text){const note=document.createElement('p');note.className='marker-loot-note';note.textContent=text;return note;}
async function showChestLoot(marker){
  markerLoot.replaceChildren();markerLoot.hidden=!marker.loot;
  if(!marker.loot)return;
  markerLoot.append(chestNote('Loading possible loot…'));
  try{
    const [data,catalog]=await Promise.all([loadChestTips(),loadLootTables()]);if(selectedMarker!==marker)return;
    const pools=poolIdsFor(marker,data).map(id=>catalog.pools.find(p=>p.id===id)).filter(Boolean);
    if(pools.length){renderGradeLoot(marker,pools);return;}
    let tip=data.tips?.[marker.loot];markerLoot.replaceChildren();
    if(tip?.pools){
      const variants=tip.pools, label=document.createElement('label');label.textContent='Chest element ';
      const select=document.createElement('select');select.setAttribute('aria-label','Chest element');
      for(const pool of variants){const option=document.createElement('option');option.value=pool.key;option.textContent=(pool.kind||'Chest').replace('TreasureBox_','')+' · '+pool.pct.toFixed(2)+'% selection';select.append(option);}
      label.append(select);markerLoot.append(label);
      markerLoot.append(chestNote('Selection chances apply when this spawner chooses an elemental chest. They do not measure whether a chest appears.'));
      select.addEventListener('change',()=>renderPool(data.tips[select.value]));
      tip=data.tips[select.value];
    }
    const poolContent=document.createElement('div');markerLoot.append(poolContent);
    function renderPool(tip){
    poolContent.replaceChildren();
    if(!tip?.grades&&!tip?.entries){poolContent.append(chestNote('This location has no independently verified loot table.'));return;}
    const heading=document.createElement('h3');heading.textContent=tip.entries?'Possible loot':'Possible loot by chest grade';poolContent.append(heading);
    if(!tip.chanceBasis)poolContent.append(chestNote(tip.label.replace(/([a-z])([A-Z])/g,'$1 $2')));
    const label=document.createElement('label');label.textContent='Chest grade ';
    const grade=document.createElement('select');grade.setAttribute('aria-label','Chest grade');
    for(const value of Object.keys(tip.grades||{}).sort((a,b)=>a-b)){const option=document.createElement('option');option.value=value;option.textContent='Grade '+value;grade.append(option);}
    if(!tip.entries){label.append(grade);poolContent.append(label);}
    const list=document.createElement('ul');list.className='marker-loot-list';poolContent.append(list);
    const count=chestNote('');poolContent.append(count);
    const more=document.createElement('button');more.type='button';more.textContent='Show all loot';poolContent.append(more);let expanded=false;
    function render(){list.replaceChildren();const entries=tip.entries||tip.grades[grade.value]||[];
      for(const item of entries.slice(0,expanded?entries.length:12)){
        const row=document.createElement('li');if(item.icon){const icon=document.createElement('img');icon.src=item.icon;icon.alt='';icon.loading='lazy';row.append(icon);}
        const name=document.createElement('span');name.textContent=item.name+(tip.chanceBasis==='field-slot'?` ×${item.min===item.max?item.min:item.min+'–'+item.max} · slot ${item.slot}`:'');
        const chance=document.createElement('strong');chance.textContent=Number(item.pct.toFixed(2))+'%';row.append(name,chance);list.append(row);
      }
      count.textContent='Showing '+(expanded?entries.length:Math.min(12,entries.length))+' of '+entries.length+' table entries.';more.hidden=entries.length<=12;more.textContent=expanded?'Show fewer':'Show all loot';
    }
    grade.addEventListener('change',()=>{expanded=false;render();});more.addEventListener('click',()=>{expanded=!expanded;render();});render();
    poolContent.append(chestNote(tip.chanceBasis==='field-slot'?'Percentages combine the loot slot’s activation chance with this entry’s weight share across the full slot. Separate slots roll independently; repeated items can appear in multiple slots. Quantities are the possible range for each entry. These table-roll odds do not measure chest appearance, chest grade selection or respawn time.':'These are loot-table chances for the selected grade. The location record does not fix a chest grade. Appearance odds and respawn time are not recorded.'));
    }
    renderPool(tip);
    if(marker.metadata?.onlyOnePrize)markerLoot.append(chestNote('Only one prize chest is active within its oil-rig selection group. Other marked positions can be empty.'));
    const source=document.createElement('a');source.href='./wiki.html#chest-loot';source.textContent='Full loot tables';markerLoot.append(source);
  }catch{if(selectedMarker===marker)markerLoot.replaceChildren(chestNote('Chest loot could not load.'));}
}
function renderGradeLoot(marker,pools){
  markerLoot.replaceChildren();
  const heading=document.createElement('h3');heading.textContent='Possible loot by chest grade';markerLoot.append(heading);
  const poolSelect=document.createElement('select');poolSelect.setAttribute('aria-label','Loot pool');
  for(const p of pools){const o=document.createElement('option');o.value=p.id;o.textContent=p.region+' · '+p.label;poolSelect.append(o);}
  const poolLabel=document.createElement('label');poolLabel.textContent='Chest pool ';poolLabel.append(poolSelect);markerLoot.append(poolLabel);
  const gradeSelect=document.createElement('select');gradeSelect.setAttribute('aria-label','Chest grade');
  const gradeLabel=document.createElement('label');gradeLabel.textContent='Chest grade ';gradeLabel.append(gradeSelect);markerLoot.append(gradeLabel);
  const body=document.createElement('div');markerLoot.append(body);
  const full=document.createElement('a');full.textContent='Full loot tables for this chest';markerLoot.append(full);
  function render(){
    const pool=pools.find(p=>p.id===poolSelect.value);body.replaceChildren();full.href='./wiki.html#chest-loot/'+encodeURIComponent('game:'+pool.id);
    for(const slot of pool.grades[gradeSelect.value]||[]){
      const caption=chestNote(`Slot ${slot.slot} · ${slot.activation===100?'Always rolls':slot.activation.toLocaleString('en-US')+'% chance to roll'}`);body.append(caption);
      const list=document.createElement('ul');list.className='marker-loot-list';body.append(list);
      for(const entry of slot.entries.slice(0,8)){
        const row=document.createElement('li');if(entry.icon){const img=document.createElement('img');img.src=entry.icon;img.alt='';img.loading='lazy';row.append(img);}
        const name=document.createElement('a');name.href='./wiki.html#item/'+encodeURIComponent(entry.wikiId||entry.id);name.textContent=entry.name+' ×'+(entry.min===entry.max?entry.min.toLocaleString('en-US'):entry.min.toLocaleString('en-US')+'–'+entry.max.toLocaleString('en-US'));
        const chance=document.createElement('strong');chance.textContent=Number(entry.share.toFixed(2))+'%';row.append(name,chance);list.append(row);
      }
      if(slot.entries.length>8)body.append(chestNote(`${slot.entries.length-8} more entries in the full table.`));
    }
  }
  function changePool(){const pool=pools.find(p=>p.id===poolSelect.value);gradeSelect.replaceChildren();for(const grade of Object.keys(pool.grades).sort((a,b)=>a-b)){const o=document.createElement('option');o.value=grade;o.textContent='Grade '+grade;gradeSelect.append(o);}render();}
  poolSelect.addEventListener('change',changePool);gradeSelect.addEventListener('change',render);changePool();
  markerLoot.append(chestNote('Item percentages are shares within the selected grade and slot. Each slot rolls separately. A location does not guarantee every listed grade; chest appearance, grade selection and respawn odds are not recorded.'));
  if(marker.metadata?.onlyOnePrize)markerLoot.append(chestNote('Only one prize position is active in this oil-rig selection group.'));
}
function selectMarker(marker){
  hideSpawnDetails();markerSpawns.hidden=true;markerSpawns.replaceChildren();
  selectedMarker=marker;pinnedPosition=marker.pixel;cursor=null;
  markerDetail.hidden=false;
  document.querySelector('#marker-detail-dot').src=marker.icon||categoryById.get(marker.category).icon;
  document.querySelector('#marker-detail-name').textContent=marker.name;
  document.querySelector('#marker-detail-type').textContent=`${markerDisplayCategory(marker)}${marker.detail?` · ${marker.detail}`:''}${marker.level?` · Lv ${marker.level}`:''}${marker.metadata?.underground?' · Underground':''}${marker.metadata?.condition?' · '+marker.metadata.condition:''}`;
  document.querySelector('#marker-detail-coordinates').textContent=`X ${decimal(marker.gameX)} · Y ${decimal(marker.gameY)}`;
  const trackable=isTrackable(marker);
  markerProgressControl.hidden=!trackable;markerProgressNote.hidden=!trackable;
  if(trackable){markerProgressCheckbox.checked=completedMarkers.has(marker.id);markerProgressLabel.textContent=progressLabel(marker.category);}
  const links=document.querySelector('#marker-wiki-links');links.replaceChildren();
  for(const link of markerWikiLinks(marker,palRoster)){const a=document.createElement('a');a.href=link.href;a.textContent=link.label;links.append(a);}
  document.querySelector('#marker-share-url').hidden=true;document.querySelector('#marker-share-status').textContent='';document.querySelector('#copy-marker-link').textContent='Copy link';
  showChestLoot(marker);
  if(marker.category==='Wild Pal Spawn'){
    const areas=spawnAreasAt(habitatAreas,marker.pixel).filter(a=>Math.abs(a.worldZ-(marker.metadata?.z??a.worldZ))<1);
    if(areas.length){markerSpawns.hidden=false;renderSpawnGroups(markerSpawns,areas);}
  }
  markerTooltip.hidden=true;scheduleDraw();
}
function clearMarkerSelection(){selectedMarker=null;markerDetail.hidden=true;markerLoot.hidden=true;markerSpawns.hidden=true;hideSpawnDetails();}
document.querySelector('#copy-marker-link').addEventListener('click',async()=>{
  const marker=selectedMarker;if(!marker)return;
  const map=Object.keys(mapConfigs).find(key=>mapConfigs[key]===currentMap);
  const url=new URL(markerViewUrl(location.href,map,{...marker,palId:marker.category==='Wild Pal Spawn'?selectedPal:undefined},camera.scale/fitScale));
  if(marker.category==='Wild Pal Spawn')url.searchParams.set('time',habitatTime);
  try{await navigator.clipboard.writeText(url.href);if(selectedMarker===marker){document.querySelector('#copy-marker-link').textContent='Copied';document.querySelector('#marker-share-status').textContent='Link opens this location zoomed in.';}}
  catch{if(selectedMarker===marker){const input=document.querySelector('#marker-share-url');input.value=url.href;input.hidden=false;input.focus();input.select();document.querySelector('#marker-share-status').textContent='Copy the selected link.';}}
});
function readCoordinates(x,y,label){
  const point=screenToPixel(x,y,camera);
  const valid=loaded&&onMap(point);
  const game=pixelToGame(point.x,point.y,currentMap.calibration);
  coordX.value=valid?decimal(game.x):'—';
  coordY.value=valid?decimal(game.y):'—';
  coordinateSource.textContent=valid?label:loaded?'OUTSIDE MAP':'CENTER OF VIEW';
  // Recover raw world coordinates from unrounded map coordinates using the
  // game-derived conversion also documented by palworld-coord.
  const ground=valid?elevation.sample(game.y*459-123888,game.x*459+158000):{state:'outside'};
  coordZ.classList.toggle('pending',ground.state==='loading');
  if(ground.state==='ready'){
    coordZ.value=`≈ ${Math.round(ground.z).toLocaleString('en-US')}`;
    elevationNote.textContent=`${(ground.z/100).toFixed(1)} m · Sampled landscape; excludes structures and caves`;
  }else{
    coordZ.value=ground.state==='loading'?'…':'—';
    elevationNote.textContent=ground.state==='loading'?'Loading terrain height…':ground.state==='error'?'Terrain height couldn’t load. Move here again to retry.':ground.state==='outside'?'Move over the map for ground elevation':'Sea level or no landscape height data';
  }
  const nextCommand=valid?`/tp ${decimal(game.x)} ${decimal(game.y)}${ground.state==='ready'?` ${decimal(ground.z+teleportClearanceCm)}`:''}`:'';
  if(nextCommand!==teleportText){teleportText=nextCommand;copyTeleport.textContent='Copy';}
  teleportCommand.textContent=teleportText||'/tp …';
  copyTeleport.disabled=!valid;
  teleportNote.textContent=ground.state==='ready'?'PalDefender · Teleport Z adds 150 cm above terrain':valid?'PalDefender · Z omitted; mod tries to find ground height':'PalDefender · Move over the map to choose a destination';
}
function updateReadout(){
  unpinButton.hidden=!pinnedPosition;
  const point=pinnedPosition?{x:camera.x+pinnedPosition.x*camera.scale,y:camera.y+pinnedPosition.y*camera.scale}:cursor??{x:width/2,y:height/2};
  readCoordinates(point.x,point.y,selectedMarker?'LOCATION MARKER':pinnedPosition?'PINNED POSITION':cursor?'CURSOR POSITION':'CENTER OF VIEW');
}
function constrain(){
  const margin=60;
  camera.x=Math.max(margin-image.naturalWidth*camera.scale,Math.min(width-margin,camera.x));
  camera.y=Math.max(margin-image.naturalHeight*camera.scale,Math.min(height-margin,camera.y));
}
function draw(){
  context.clearRect(0,0,width,height);
  if(!loaded)return;
  context.imageSmoothingEnabled=true;
  context.imageSmoothingQuality='high';
  context.drawImage(image,camera.x,camera.y,image.naturalWidth*camera.scale,image.naturalHeight*camera.scale);
  drawHabitat();
  drawMarkers();
  const crosshair=pinnedPosition?{x:camera.x+pinnedPosition.x*camera.scale,y:camera.y+pinnedPosition.y*camera.scale}:cursor;
  if(crosshair&&onMap(screenToPixel(crosshair.x,crosshair.y,camera))){
    context.save();context.strokeStyle='#68e7cb';context.lineWidth=1;
    context.shadowBlur=4;context.shadowColor='#071b22';context.beginPath();
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      context.moveTo(crosshair.x+dx*7,crosshair.y+dy*7);context.lineTo(crosshair.x+dx*18,crosshair.y+dy*18);
    }
    context.stroke();context.beginPath();context.arc(crosshair.x,crosshair.y,pinnedPosition?5:3,0,Math.PI*2);context.stroke();context.restore();
  }
  zoomLabel.textContent=`${Math.round(camera.scale/fitScale*100)}%`;
  controls[0].disabled=camera.scale>=fitScale*12-.00001;
  controls[1].disabled=camera.scale<=fitScale*.5+.00001;
  updateReadout();
  const region=regionCursor?regionAtPixel(screenToPixel(regionCursor.x,regionCursor.y,camera),currentMap.name):null;
  regionBanner.hidden=!region;
  if(region&&regionBanner.textContent!==region.name)regionBanner.textContent=region.name;
}
function fit(){
  if(!loaded)return;
  fitScale=Math.min((width-24)/image.naturalWidth,(height-24)/image.naturalHeight);
  camera.scale=fitScale;camera.x=(width-image.naturalWidth*camera.scale)/2;camera.y=(height-image.naturalHeight*camera.scale)/2;
  cursor=null;pinnedPosition=null;clearMarkerSelection();scheduleDraw();
}
function resize(){
  const rect=canvas.getBoundingClientRect();
  const wasReady=width>0&&height>0&&loaded;
  const center=wasReady?screenToPixel(width/2,height/2,camera):null;
  const zoom=wasReady?camera.scale/fitScale:1;
  width=rect.width;height=rect.height;
  const ratio=window.devicePixelRatio||1;
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
  context.setTransform(ratio,0,0,ratio,0,0);
  if(center){fitScale=Math.min((width-24)/image.naturalWidth,(height-24)/image.naturalHeight);camera.scale=fitScale*zoom;camera.x=width/2-center.x*camera.scale;camera.y=height/2-center.y*camera.scale;cursor=null;constrain();scheduleDraw();}
  else fit();
}
function zoomAt(factor,point={x:width/2,y:height/2}){
  if(!loaded)return;
  if(!spawnPinned)hideSpawnDetails();
  const pixel=screenToPixel(point.x,point.y,camera);
  camera.scale=Math.max(fitScale*.5,Math.min(fitScale*12,camera.scale*factor));
  camera.x=point.x-pixel.x*camera.scale;camera.y=point.y-pixel.y*camera.scale;constrain();scheduleDraw();
}
function pinchState(){const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};}
canvas.addEventListener('pointerdown',event=>{
  if(!loaded||event.button!==0)return;
  canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
  const point=position(event);pointers.set(event.pointerId,point);cursor=point;
  if(pointers.size===1){pressStart=point;pressMoved=false;}
  if(pointers.size===2){lastPinch=pinchState();pressMoved=true;}canvas.classList.add('dragging');scheduleDraw();
});
canvas.addEventListener('pointermove',event=>{
  if(!loaded)return;
  const point=position(event);const previous=pointers.get(event.pointerId);
  regionCursor=event.pointerType==='touch'?null:point;
  if(previous){
    if(pressStart&&Math.hypot(point.x-pressStart.x,point.y-pressStart.y)>6)pressMoved=true;
    pointers.set(event.pointerId,point);
    if(pointers.size===1){camera.x+=point.x-previous.x;camera.y+=point.y-previous.y;constrain();cursor=point;markerTooltip.hidden=true;if(!spawnPinned)hideSpawnDetails();}
    else if(pointers.size>=2){const next=pinchState();if(lastPinch&&lastPinch.distance>0){zoomAt(next.distance/lastPinch.distance,lastPinch);camera.x+=next.x-lastPinch.x;camera.y+=next.y-lastPinch.y;constrain();}lastPinch=next;cursor=null;}
  }else if(event.pointerType!=='touch'){cursor=point;showMarkerTooltip(point);showSpawnAt(screenToPixel(point.x,point.y,camera));}
  scheduleDraw();
});
function endPointer(event){
  if(event.type==='pointerup'&&pointers.size===1&&pressStart&&!pressMoved){
    const at=position(event),hit=markerHit(at);
    if(hit?.markers.length===1)selectMarker(hit.markers[0]);
    else if(hit?.markers.length>1){markerTooltip.hidden=true;zoomAt(2,at);}
    else{const pixel=screenToPixel(at.x,at.y,camera);if(onMap(pixel)){clearMarkerSelection();pinnedPosition=pixel;showSpawnAt(pixel,true);scheduleDraw();}}
  }
  pointers.delete(event.pointerId);lastPinch=null;
  pressStart=null;
  if(!pointers.size)canvas.classList.remove('dragging');
  if(pointers.size>=2)lastPinch=pinchState();
  if(event.type==='pointercancel'){cursor=null;markerTooltip.hidden=true;scheduleDraw();}
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endPointer);
// Retain the last hover destination while the pointer moves to the Copy button.
canvas.addEventListener('pointerleave',()=>{regionCursor=null;regionBanner.hidden=true;markerTooltip.hidden=true;if(!pointers.size)scheduleDraw();});
canvas.addEventListener('wheel',event=>{event.preventDefault();const point=position(event);cursor=point;regionCursor=point;zoomAt(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.003),point);},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(!loaded)return;
  if(event.key==='Escape'){event.preventDefault();pinnedPosition=null;cursor=null;clearMarkerSelection();scheduleDraw();return;}
  const moves={ArrowLeft:[65,0],ArrowRight:[-65,0],ArrowUp:[0,65],ArrowDown:[0,-65]};
  if(moves[event.key]){event.preventDefault();cursor=null;camera.x+=moves[event.key][0];camera.y+=moves[event.key][1];constrain();draw();}
  else if(['+','=','-','_','Home'].includes(event.key)){event.preventDefault();cursor=null;if(event.key==='Home')fit();else zoomAt(['+','='].includes(event.key)?1.3:1/1.3);draw();}
  else return;
  document.querySelector('#announcement').textContent=`Center coordinates: X ${coordX.value}, Y ${coordY.value}. Ground Z ${coordZ.value} centimeters. ${elevationNote.textContent}. Zoom ${zoomLabel.textContent}.`;
});
document.querySelector('#zoom-in').addEventListener('click',()=>{cursor=null;zoomAt(1.4);});
document.querySelector('#zoom-out').addEventListener('click',()=>{cursor=null;zoomAt(1/1.4);});
document.querySelector('#reset').addEventListener('click',fit);
unpinButton.addEventListener('click',()=>{pinnedPosition=null;cursor=null;clearMarkerSelection();scheduleDraw();});
function toggleLayers(open){
  if(open)mobileSiteMenu.open=false;
  mapBody.classList.toggle('sidebar-collapsed',!open);
  layersPanel.inert=!open;
  layersPanel.setAttribute('aria-hidden',String(!open));
  sidebarBackdrop.hidden=!open;
  layersToggle.setAttribute('aria-expanded',String(open));
  layersToggle.setAttribute('aria-label',open?'Collapse location sidebar':'Expand location sidebar');
  layersToggle.title=open?'Collapse locations':'Expand locations';
  if(open&&!window.matchMedia('(max-width:700px)').matches)markerSearch.focus();
  else if(!open)layersToggle.focus();
  resize();
}
layersToggle.addEventListener('click',()=>toggleLayers(mapBody.classList.contains('sidebar-collapsed')));
document.querySelector('#layers-close').addEventListener('click',()=>toggleLayers(false));
sidebarBackdrop.addEventListener('click',()=>toggleLayers(false));
document.querySelector('#layers-all').addEventListener('click',()=>{linkedLootPool=null;for(const marker of markers)activeCategories.add(marker.category);updateLayerControls();refreshVisibleMarkers();});
document.querySelector('#layers-none').addEventListener('click',()=>{for(const marker of markers)activeCategories.delete(marker.category);updateLayerControls();refreshVisibleMarkers();});
hideCompletedCheckbox.addEventListener('change',()=>{hideCompleted=hideCompletedCheckbox.checked;try{localStorage.setItem(hideCompletedStorageKey,String(hideCompleted));}catch{}refreshVisibleMarkers();});
markerSearch.addEventListener('input',()=>{searchTerm=markerSearch.value.trim().toLowerCase();updateLayerControls();refreshVisibleMarkers();});
layersPanel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();toggleLayers(false);}});
markerProgressCheckbox.addEventListener('change',()=>{
  if(!selectedMarker||!isTrackable(selectedMarker))return;
  if(markerProgressCheckbox.checked)completedMarkers.add(selectedMarker.id);
  else completedMarkers.delete(selectedMarker.id);
  saveProgress();updateLayerControls();refreshVisibleMarkers();
});
document.querySelector('#marker-detail-close').addEventListener('click',clearMarkerSelection);
copyTeleport.addEventListener('click',async()=>{
  if(!teleportText)return;
  const copied=teleportText;
  try{await navigator.clipboard.writeText(copied);if(teleportText===copied)copyTeleport.textContent='Copied';}
  catch{copyTeleport.textContent='Select text';}
  clearTimeout(copyResetTimer);copyResetTimer=setTimeout(()=>{copyTeleport.textContent='Copy';},2000);
});
document.querySelector('#retry').addEventListener('click',()=>{error.hidden=true;loading.hidden=false;loadImage();});
function loadImage(){loaded=false;loading.hidden=false;error.hidden=true;controls.forEach(button=>button.disabled=true);image.src=currentMap.image;}
async function focusLinkedMarker(){
  if(!loaded||!markers.length||!pendingLinkedMarker)return;
  const linkedId=pendingLinkedMarker;pendingLinkedMarker=null;
  if(linkedParams.get('pal')&&linkedId.startsWith('spawn:')){const pal=palRoster.find(p=>p.id===linkedParams.get('pal'));if(pal){document.querySelector('#pals-tab').click();habitatTime=['all','night'].includes(linkedParams.get('time'))?linkedParams.get('time'):'day';for(const b of document.querySelectorAll('[data-habitat-time]'))b.setAttribute('aria-pressed',String(b.dataset.habitatTime===habitatTime));await selectHabitat(pal.id,pal.name);}}
  const marker=[...markers,...habitatMarkers].find(m=>m.id===linkedId);
  if(!marker)return;
  activeCategories.clear();activeCategories.add(marker.category);
  expandedGroups.add(categoryById.get(marker.category)?.group);
  hideCompleted=false;hideCompletedCheckbox.checked=false;
  const linkedZoom=Number(linkedParams.get('zoom'));camera.scale=fitScale*Math.max(4,Math.min(12,Number.isFinite(linkedZoom)?linkedZoom:4));camera.x=width/2-marker.pixel.x*camera.scale;camera.y=height/2-marker.pixel.y*camera.scale;
  updateLayerControls();refreshVisibleMarkers();selectMarker(marker);
}
image.onload=()=>{loaded=true;loading.hidden=true;error.hidden=true;controls.forEach(button=>button.disabled=false);resize();fit();focusLinkedMarker();};
image.onerror=()=>{loaded=false;loading.hidden=true;error.hidden=false;controls.forEach(button=>button.disabled=true);};
async function switchMap(key){
  if(!mapConfigs[key]||currentMap===mapConfigs[key])return;
  currentMap=mapConfigs[key];const generation=++mapGeneration;
  markers=[];visibleMarkers=[];markerHits=[];habitatMarkers=[];pinnedPosition=null;cursor=null;regionCursor=null;regionBanner.hidden=true;clearMarkerSelection();markerTooltip.hidden=true;
  elevation=new TerrainElevation(()=>{if(loaded)updateReadout();},currentMap.terrain);
  document.querySelector('#map-name').textContent=currentMap.name.toUpperCase();
  for(const link of document.querySelectorAll('#source-link,[data-map-source]'))link.href=currentMap.sourceUrl;
  for(const button of mapButtons)button.setAttribute('aria-pressed',String(button.dataset.map===key));
  updateLayerControls();layerStatus.textContent='Loading locations…';
  loadImage();
  try{const [data]=await Promise.all([loadMarkers(currentMap),categoriesReady]);if(generation!==mapGeneration)return;markers=data;refreshHabitat();updateLayerControls();}
  catch{if(generation===mapGeneration){layerStatus.textContent='Location markers could not load. Reload to retry.';document.querySelector('#layers-count').textContent='!';}}
}
for(const button of mapButtons)button.addEventListener('click',()=>switchMap(button.dataset.map));
for(const link of document.querySelectorAll('#source-link,[data-map-source]'))link.href=currentMap.sourceUrl;
new ResizeObserver(resize).observe(canvas);
if(window.matchMedia('(max-width:700px)').matches)toggleLayers(false);
resize();loadImage();
Promise.all([categoriesReady,loadMarkers(currentMap)]).then(([,data])=>{if(mapGeneration)return;markers=data;refreshVisibleMarkers();updateLayerControls();focusLinkedMarker();}).catch(()=>{layerStatus.textContent='Location markers could not load. Reload to retry.';document.querySelector('#layers-count').textContent='!';});
if(linkedParams.get('pal')&&!linkedParams.get('marker')?.startsWith('spawn:')){
  document.querySelector('#pals-tab').click();
  habitatTime=['all','night'].includes(linkedParams.get('time'))?linkedParams.get('time'):'day';
  for(const button of document.querySelectorAll('[data-habitat-time]'))button.setAttribute('aria-pressed',String(button.dataset.habitatTime===habitatTime));
  selectHabitat(linkedParams.get('pal'),palNames.get(linkedParams.get('pal'))||linkedParams.get('palName')||linkedParams.get('pal'));
}
document.querySelector('#map-name').textContent=currentMap.name.toUpperCase();
mapButtons.forEach(button=>button.setAttribute('aria-pressed',String(mapConfigs[button.dataset.map]===currentMap)));
window.addEventListener('storage',event=>{
  if(![progressStorageKey,hideCompletedStorageKey,null].includes(event.key))return;
  if(event.key===progressStorageKey||event.key===null){completedMarkers.clear();for(const id of readProgress())completedMarkers.add(id);}
  if(event.key===hideCompletedStorageKey||event.key===null){try{hideCompleted=localStorage.getItem(hideCompletedStorageKey)==='true';}catch{hideCompleted=false;}hideCompletedCheckbox.checked=hideCompleted;}
  if(selectedMarker)markerProgressCheckbox.checked=completedMarkers.has(selectedMarker.id);
  updateLayerControls();refreshVisibleMarkers();
});
