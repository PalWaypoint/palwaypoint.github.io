// Reconstructed planner connections from native families and model pivots.
// The game's compiled support/collision checks are not simulated.
const rad=Math.PI/180;
const angle=r=>((r%360)+360)%360;
const turn=([x,y],r)=>{const c=Math.cos(r*rad),s=Math.sin(r*rad);return[x*c-y*s,x*s+y*c];};
function profile(id,buildings,visuals){
 const b=buildings.get(id),strategy=visuals.buildings[id]?.strategy||'',e=b?.envelope;
 if(!e)return null;
 const family=/Foundation$/.test(strategy)?'foundation':/^(Roof|TriangleRoof)$/.test(strategy)?'roof':/^WallV2/.test(strategy)&&!/ladder/i.test(id)?'wall':'other';
 const width=Math.round(Math.max(e.max[0]-e.min[0],e.max[1]-e.min[1]));
 if(family==='other'||width<1||width>12)return null;
 const half=width/2,outline=/Triangle/.test(strategy)?[[-half,-half],[half,-half],[half,half]]:[[-half,-half],[half,-half],[half,half],[-half,half]];
 return{family,width,outline,top:e.max[2],group:b.group,regularWall:strategy==='WallV2'&&!/Triangle/i.test(id)};
}
const edges=outline=>outline.map((a,i)=>[a,outline[(i+1)%outline.length]]);
export function surfaceOffset(id,buildings,visuals){const p=profile(id,buildings,visuals);return p?.family==='roof'?p.top:0;}
export function supportsStructureSnap(id,buildings,visuals){return !!profile(id,buildings,visuals);}
export function sameConnection(a,b,buildings,visuals){
 if(a.building!==b.building||Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=.001)return false;
 const shape=profile(a.building,buildings,visuals),period=!a.size&&!b.size&&shape&&shape.family!=='wall'&&shape.outline.length===4?90:360;
 const difference=angle(a.rotation-b.rotation)%period;
 return Math.min(difference,period-difference)<.01;
}
export function placementHeight(surface,id,buildings,visuals){return surface-surfaceOffset(id,buildings,visuals);}
export function floorLevels(parts,buildings,visuals,brush,maxFloor=2){
 const fixed=parts.filter(p=>!p.size),foundations=fixed.filter(p=>profile(p.building,buildings,visuals)?.family==='foundation');
 const ground=foundations.length?Math.min(...foundations.map(p=>p.z)):0;
 const walls=fixed.map(p=>({part:p,profile:profile(p.building,buildings,visuals)})).filter(x=>x.profile?.regularWall);
 const group=buildings.get(brush)?.group;
 const fallback=[...buildings.values()].find(b=>b.group===group&&profile(b.id,buildings,visuals)?.regularWall&&!/Window|Door/i.test(b.id))||buildings.get('Wooden_wall');
 const story=walls[0]?.profile.top||profile(fallback?.id,buildings,visuals)?.top||3.25;
 const actual=new Map();let highest=Math.max(2,maxFloor);
 for(const p of fixed){const shape=profile(p.building,buildings,visuals);if(!shape||!['wall','roof'].includes(shape.family))continue;
  const surface=p.z+shape.top,index=Math.round((surface-ground)/story);
  if(index<1||index>150)continue;highest=Math.max(highest,index);actual.set(index,Math.max(actual.get(index)??-Infinity,surface));
 }
 highest=Math.min(150,highest+1);
 return Array.from({length:highest+1},(_,index)=>({index,label:index===0?'G':String(index),height:index===0?ground:actual.get(index)??ground+story*index})).filter(f=>Math.abs(f.height)<=500);
}
export function structuralSnap(pos,rotation,brush,parts,buildings,visuals,step=.5,enabled=true,exclude=null){
 const grid=n=>Math.round(n/step)*step;
 // Z is a chosen floor/pivot height, not a multiple of the horizontal grid.
 const plain={x:grid(pos.x),y:grid(pos.y),z:pos.z,rotation,snapped:false};
 const mine=profile(brush,buildings,visuals);if(!enabled||!mine)return plain;
 const candidates=[];
 for(const p of parts){if(p.id===exclude||p.size)continue;const other=profile(p.building,buildings,visuals);if(!other)continue;
  const add=(x,y,z,r=p.rotation)=>{const[dx,dy]=turn([x,y],p.rotation);candidates.push({x:p.x+dx,y:p.y+dy,z:p.z+z,rotation:angle(r),snapped:true});};
  if(other.family==='foundation'||other.family==='roof'){
   if(mine.family==='foundation'||mine.family==='roof'){
    if(mine.family==='foundation'&&other.family==='roof')continue;
    for(const[a,b]of edges(other.outline))for(const[u,v]of edges(mine.outline)){
     if(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-Math.hypot(v[0]-u[0],v[1]-u[1]))>.05)continue;
     const r=(Math.atan2(a[1]-b[1],a[0]-b[0])-Math.atan2(v[1]-u[1],v[0]-u[0]))/rad;
     const[x,y]=turn(u,r),z=mine.family==='foundation'?0:other.top-mine.top;
     add(b[0]-x,b[1]-y,z,p.rotation+r);
    }
   }else if(mine.family==='wall'){
    for(const[a,b]of edges(other.outline)){
     if(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-mine.width)>.05)continue;
     add((a[0]+b[0])/2,(a[1]+b[1])/2,other.family==='roof'?other.top:0,p.rotation+Math.atan2(b[1]-a[1],b[0]-a[0])/rad-90);
    }
   }
  }else if(other.family==='wall'){
   if(mine.family==='wall'){add(0,0,other.top);add(0,other.width,0);add(0,-other.width,0);}
   if(mine.family==='roof'){
    // Keep the roof's visible top flush with the actual wall top.
    for(const[u,v]of edges(mine.outline)){
     if(Math.abs(Math.hypot(v[0]-u[0],v[1]-u[1])-other.width)>.05)continue;
     for(const side of[-1,1]){
      const a=[0,-side*other.width/2],b=[0,side*other.width/2],r=(Math.atan2(a[1]-b[1],a[0]-b[0])-Math.atan2(v[1]-u[1],v[0]-u[0]))/rad;
      const[x,y]=turn(u,r);add(b[0]-x,b[1]-y,other.top-mine.top,p.rotation+r);
     }
    }
   }
  }
 }
 const threshold=Math.max(1,Math.min(1.75,step*2));
 const distance=c=>Math.hypot(c.x-pos.x,c.y-pos.y,c.z-pos.z);
 const rotationDistance=(a,b)=>Math.min(angle(a-b),angle(b-a));
 const viable=candidates.filter(c=>distance(c)<=threshold&&!parts.some(p=>p.id!==exclude&&sameConnection(p,{...c,building:brush},buildings,visuals)));
 viable.sort((a,b)=>Math.abs(distance(a)-distance(b))>.00001?distance(a)-distance(b):rotationDistance(a.rotation,rotation)-rotationDistance(b.rotation,rotation));
 return viable[0]||plain;
}
