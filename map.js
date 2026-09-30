import {pixelToGame, screenToPixel} from './coordinates.js';
import {mapConfigs} from './map-config.js?v=independent-camps-1';
import {TerrainElevation} from './elevation.js';
import {loadMarkers,loadCategories,markerCategories,categoryById,initCaptureTracker,regionAtPixel} from './markers.js?v=capture-regions-1';

initCaptureTracker();

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
let currentMap=mapConfigs.islands,mapGeneration=0;
const categoriesReady=loadCategories();
let elevation = new TerrainElevation(()=>{if(loaded)updateReadout();},currentMap.terrain);

function scheduleDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function position(event){const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
function onMap(point){return point.x>=0&&point.y>=0&&point.x<=image.naturalWidth&&point.y<=image.naturalHeight;}
function decimal(value){return (Math.abs(value)<.005?0:value).toFixed(2);}
function isTrackable(marker){return marker.category==='Dungeon'||!!categoryById.get(marker.category)?.trackable;}
function progressLabel(category){
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
  if(hideCompleted&&completedMarkers.has(marker.id))return false;
  if(!searchTerm)return true;
  const category=categoryById.get(marker.category);
  return `${marker.name} ${marker.detail} ${category?.name} ${category?.group}`.toLowerCase().includes(searchTerm);
}
function refreshVisibleMarkers(){visibleMarkers=markers.filter(markerMatches);updateLayerSummary();scheduleDraw();}
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
  const count=visibleMarkers.length;
  document.querySelector('#layers-count').textContent=count.toLocaleString('en-US');
  layerStatus.textContent=markers.length?`${count.toLocaleString('en-US')} of ${markers.length.toLocaleString('en-US')} ${currentMap.name} locations shown. Click a pin for coordinates.`:'No locations loaded.';
}
function drawMarkers(){
  markerHits=[];
  if(!visibleMarkers.length)return;
  const cells=new Map(),cellSize=42,margin=cellSize+24;
  for(const marker of visibleMarkers){
    const x=camera.x+marker.pixel.x*camera.scale,y=camera.y+marker.pixel.y*camera.scale;
    // Keep the grid fixed to the map so dragging cannot reshuffle clusters.
    // The margin includes every member of a cluster whose center is on screen.
    if(x< -margin||x>width+margin||y< -margin||y>height+margin)continue;
    const key=`${Math.floor(marker.pixel.x*camera.scale/cellSize)},${Math.floor(marker.pixel.y*camera.scale/cellSize)}`;
    let cell=cells.get(key);if(!cell){cell={x:0,y:0,markers:[]};cells.set(key,cell);}
    cell.x+=marker.pixel.x;cell.y+=marker.pixel.y;cell.markers.push(marker);
  }
  context.save();context.textAlign='center';context.textBaseline='middle';context.font='bold 11px Segoe UI,Arial,sans-serif';
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
function showMarkerTooltip(point){
  const hit=markerHit(point);
  hoveredMarker=hit?.markers.length===1?hit.markers[0]:null;
  if(!hit){markerTooltip.hidden=true;return;}
  markerTooltip.replaceChildren();
  const title=document.createElement('strong');title.textContent=hit.markers.length===1?hit.markers[0].name:`${hit.markers.length} locations`;
  const subtitle=document.createElement('span');subtitle.textContent=hit.markers.length===1?categoryById.get(hit.markers[0].category).name:'Click to zoom in';
  markerTooltip.append(title,subtitle);markerTooltip.hidden=false;
  markerTooltip.style.left=`${Math.min(point.x+17,width-190)}px`;
  markerTooltip.style.top=`${Math.max(8,point.y-54)}px`;
}
function loadChestTips(){
  return chestTipsPromise??=fetch('./chest-tips.json').then(response=>{
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
    const data=await loadChestTips();
    if(selectedMarker!==marker)return;
    const tip=data.tips?.[marker.loot];
    markerLoot.replaceChildren();
    if(!tip?.items?.length){markerLoot.append(chestNote('Loot details are unavailable for this chest.'));return;}
    const heading=document.createElement('h3');heading.textContent='Possible loot';markerLoot.append(heading);
    const pool=document.createElement('p');pool.className='marker-loot-pool';pool.textContent=tip.label;markerLoot.append(pool);
    const list=document.createElement('ul');list.className='marker-loot-list';
    for(const item of tip.items){
      const row=document.createElement('li');
      if(item.icon){const icon=document.createElement('img');icon.src=item.icon;icon.alt='';icon.loading='lazy';row.append(icon);}
      const name=document.createElement('span');name.textContent=item.name;
      const chance=document.createElement('strong');chance.textContent=`~${item.pct}%`;
      row.append(name,chance);list.append(row);
    }
    markerLoot.append(list);
    if(tip.money)markerLoot.append(chestNote(`Gold Coins ×${tip.money.min.toLocaleString('en-US')}–${tip.money.max.toLocaleString('en-US')} on every opening`));
    if(tip.tier)markerLoot.append(chestNote(`Spawns up to a ${tip.tier}-tier chest`));
    if(tip.respawn)markerLoot.append(chestNote(`Estimated respawn: ${tip.respawn}`));
    markerLoot.append(chestNote('Percentages estimate item drops per opening. The chance of a chest appearing at this location is not available.'));
    const source=document.createElement('a');source.href='https://palmap.app/chest-loot';source.target='_blank';source.rel='noopener noreferrer';source.textContent='Full loot tables';markerLoot.append(source);
  }catch{
    if(selectedMarker===marker){markerLoot.replaceChildren(chestNote('Chest loot could not load.'));}
  }
}
function selectMarker(marker){
  selectedMarker=marker;pinnedPosition=marker.pixel;cursor=null;
  markerDetail.hidden=false;
  document.querySelector('#marker-detail-dot').src=marker.icon||categoryById.get(marker.category).icon;
  document.querySelector('#marker-detail-name').textContent=marker.name;
  document.querySelector('#marker-detail-type').textContent=`${categoryById.get(marker.category).name}${marker.detail?` · ${marker.detail}`:''}${marker.level?` · Lv ${marker.level}`:''}`;
  document.querySelector('#marker-detail-coordinates').textContent=`X ${decimal(marker.gameX)} · Y ${decimal(marker.gameY)}`;
  const trackable=isTrackable(marker);
  markerProgressControl.hidden=!trackable;markerProgressNote.hidden=!trackable;
  if(trackable){markerProgressCheckbox.checked=completedMarkers.has(marker.id);markerProgressLabel.textContent=progressLabel(marker.category);}
  showChestLoot(marker);
  markerTooltip.hidden=true;scheduleDraw();
}
function clearMarkerSelection(){selectedMarker=null;markerDetail.hidden=true;markerLoot.hidden=true;}
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
    if(pointers.size===1){camera.x+=point.x-previous.x;camera.y+=point.y-previous.y;constrain();cursor=point;markerTooltip.hidden=true;}
    else if(pointers.size>=2){const next=pinchState();if(lastPinch&&lastPinch.distance>0){zoomAt(next.distance/lastPinch.distance,lastPinch);camera.x+=next.x-lastPinch.x;camera.y+=next.y-lastPinch.y;constrain();}lastPinch=next;cursor=null;}
  }else if(event.pointerType!=='touch'){cursor=point;showMarkerTooltip(point);}
  scheduleDraw();
});
function endPointer(event){
  if(event.type==='pointerup'&&pointers.size===1&&pressStart&&!pressMoved){
    const at=position(event),hit=markerHit(at);
    if(hit?.markers.length===1)selectMarker(hit.markers[0]);
    else if(hit?.markers.length>1){markerTooltip.hidden=true;zoomAt(2,at);}
    else{const pixel=screenToPixel(at.x,at.y,camera);if(onMap(pixel)){clearMarkerSelection();pinnedPosition=pixel;scheduleDraw();}}
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
document.querySelector('#layers-all').addEventListener('click',()=>{for(const marker of markers)activeCategories.add(marker.category);updateLayerControls();refreshVisibleMarkers();});
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
image.onload=()=>{loaded=true;loading.hidden=true;error.hidden=true;controls.forEach(button=>button.disabled=false);resize();fit();};
image.onerror=()=>{loaded=false;loading.hidden=true;error.hidden=false;controls.forEach(button=>button.disabled=true);};
async function switchMap(key){
  if(!mapConfigs[key]||currentMap===mapConfigs[key])return;
  currentMap=mapConfigs[key];const generation=++mapGeneration;
  markers=[];visibleMarkers=[];markerHits=[];pinnedPosition=null;cursor=null;regionCursor=null;regionBanner.hidden=true;clearMarkerSelection();markerTooltip.hidden=true;
  elevation=new TerrainElevation(()=>{if(loaded)updateReadout();},currentMap.terrain);
  document.querySelector('#map-name').textContent=currentMap.name.toUpperCase();
  document.querySelector('#source-link').href=currentMap.sourceUrl;
  for(const button of mapButtons)button.setAttribute('aria-pressed',String(button.dataset.map===key));
  updateLayerControls();layerStatus.textContent='Loading locations…';
  loadImage();
  try{const [data]=await Promise.all([loadMarkers(currentMap),categoriesReady]);if(generation!==mapGeneration)return;markers=data;refreshVisibleMarkers();updateLayerControls();}
  catch{if(generation===mapGeneration){layerStatus.textContent='Location markers could not load. Reload to retry.';document.querySelector('#layers-count').textContent='!';}}
}
for(const button of mapButtons)button.addEventListener('click',()=>switchMap(button.dataset.map));
document.querySelector('#source-link').href=currentMap.sourceUrl;
new ResizeObserver(resize).observe(canvas);
if(window.matchMedia('(max-width:700px)').matches)toggleLayers(false);
resize();loadImage();
Promise.all([categoriesReady,loadMarkers(currentMap)]).then(([,data])=>{if(mapGeneration)return;markers=data;refreshVisibleMarkers();updateLayerControls();}).catch(()=>{layerStatus.textContent='Location markers could not load. Reload to retry.';document.querySelector('#layers-count').textContent='!';});
