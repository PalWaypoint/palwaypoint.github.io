import {pixelToGame, screenToPixel} from './coordinates.js';
import {mapConfig} from './map-config.js';
import {TerrainElevation} from './elevation.js';

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
const elevation = new TerrainElevation(()=>{if(loaded)updateReadout();});

function scheduleDraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;draw();});}
function position(event){const rect=canvas.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};}
function onMap(point){return point.x>=0&&point.y>=0&&point.x<=image.naturalWidth&&point.y<=image.naturalHeight;}
function decimal(value){return (Math.abs(value)<.005?0:value).toFixed(2);}
function readCoordinates(x,y,label){
  const point=screenToPixel(x,y,camera);
  const valid=loaded&&onMap(point);
  const game=pixelToGame(point.x,point.y,mapConfig.calibration);
  coordX.value=valid?decimal(game.x):'—';
  coordY.value=valid?decimal(game.y):'—';
  coordinateSource.textContent=valid?label:loaded?'OUTSIDE MAP':'CENTER OF VIEW';
  // Recover raw world coordinates from unrounded map coordinates using PalMap's
  // in-game conversion. DEM extent registration is independent of the artwork.
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
  readCoordinates(point.x,point.y,pinnedPosition?'PINNED POSITION':cursor?'CURSOR POSITION':'CENTER OF VIEW');
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
}
function fit(){
  if(!loaded)return;
  fitScale=Math.min((width-24)/image.naturalWidth,(height-24)/image.naturalHeight);
  camera.scale=fitScale;camera.x=(width-image.naturalWidth*camera.scale)/2;camera.y=(height-image.naturalHeight*camera.scale)/2;
  cursor=null;pinnedPosition=null;scheduleDraw();
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
  if(previous){
    if(pressStart&&Math.hypot(point.x-pressStart.x,point.y-pressStart.y)>6)pressMoved=true;
    pointers.set(event.pointerId,point);
    if(pointers.size===1){camera.x+=point.x-previous.x;camera.y+=point.y-previous.y;constrain();cursor=point;}
    else if(pointers.size>=2){const next=pinchState();if(lastPinch&&lastPinch.distance>0){zoomAt(next.distance/lastPinch.distance,lastPinch);camera.x+=next.x-lastPinch.x;camera.y+=next.y-lastPinch.y;constrain();}lastPinch=next;cursor=null;}
  }else if(event.pointerType!=='touch')cursor=point;
  scheduleDraw();
});
function endPointer(event){
  if(event.type==='pointerup'&&pointers.size===1&&pressStart&&!pressMoved){
    const pixel=screenToPixel(position(event).x,position(event).y,camera);
    if(onMap(pixel)){pinnedPosition=pixel;scheduleDraw();}
  }
  pointers.delete(event.pointerId);lastPinch=null;
  pressStart=null;
  if(!pointers.size)canvas.classList.remove('dragging');
  if(pointers.size>=2)lastPinch=pinchState();
  if(event.type==='pointercancel'){cursor=null;scheduleDraw();}
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,endPointer);
// Retain the last hover destination while the pointer moves to the Copy button.
canvas.addEventListener('pointerleave',()=>{if(!pointers.size)scheduleDraw();});
canvas.addEventListener('wheel',event=>{event.preventDefault();const point=position(event);cursor=point;zoomAt(Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.003),point);},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(!loaded)return;
  if(event.key==='Escape'){event.preventDefault();pinnedPosition=null;cursor=null;scheduleDraw();return;}
  const moves={ArrowLeft:[65,0],ArrowRight:[-65,0],ArrowUp:[0,65],ArrowDown:[0,-65]};
  if(moves[event.key]){event.preventDefault();cursor=null;camera.x+=moves[event.key][0];camera.y+=moves[event.key][1];constrain();draw();}
  else if(['+','=','-','_','Home'].includes(event.key)){event.preventDefault();cursor=null;if(event.key==='Home')fit();else zoomAt(['+','='].includes(event.key)?1.3:1/1.3);draw();}
  else return;
  document.querySelector('#announcement').textContent=`Center coordinates: X ${coordX.value}, Y ${coordY.value}. Ground Z ${coordZ.value} centimeters. ${elevationNote.textContent}. Zoom ${zoomLabel.textContent}.`;
});
document.querySelector('#zoom-in').addEventListener('click',()=>{cursor=null;zoomAt(1.4);});
document.querySelector('#zoom-out').addEventListener('click',()=>{cursor=null;zoomAt(1/1.4);});
document.querySelector('#reset').addEventListener('click',fit);
unpinButton.addEventListener('click',()=>{pinnedPosition=null;cursor=null;scheduleDraw();});
copyTeleport.addEventListener('click',async()=>{
  if(!teleportText)return;
  const copied=teleportText;
  try{await navigator.clipboard.writeText(copied);if(teleportText===copied)copyTeleport.textContent='Copied';}
  catch{copyTeleport.textContent='Select text';}
  clearTimeout(copyResetTimer);copyResetTimer=setTimeout(()=>{copyTeleport.textContent='Copy';},2000);
});
document.querySelector('#retry').addEventListener('click',()=>{error.hidden=true;loading.hidden=false;loadImage();});
function loadImage(){controls.forEach(button=>button.disabled=true);image.src=mapConfig.image;}
image.onload=()=>{loaded=true;loading.hidden=true;error.hidden=true;controls.forEach(button=>button.disabled=false);resize();fit();};
image.onerror=()=>{loaded=false;loading.hidden=true;error.hidden=false;controls.forEach(button=>button.disabled=true);};
document.querySelector('#source-link').href=mapConfig.sourceUrl;
new ResizeObserver(resize).observe(canvas);
resize();loadImage();
