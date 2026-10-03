export const views=['top','front','back','left','right','isometric'];
export function project([x,y,z],view){switch(view){case 'top':return [x,-y,z];case 'front':return [x,-z,-y];case 'back':return [-x,-z,y];case 'left':return [-y,-z,-x];case 'right':return [y,-z,x];case 'isometric':return [(x-y)*Math.SQRT1_2,(x+y)*Math.sqrt(1/6)-z*Math.sqrt(2/3),x+y+z];default:throw Error('Unknown view');}}
export function unproject([u,v],view,plane=0,anchor={x:0,y:0}){switch(view){case 'top':return {x:u,y:-v,z:plane};case 'front':return {x:u,y:anchor.y,z:-v};case 'back':return {x:-u,y:anchor.y,z:-v};case 'left':return {x:anchor.x,y:-u,z:-v};case 'right':return {x:anchor.x,y:u,z:-v};case 'isometric':{const difference=u/Math.SQRT1_2,sum=(v+plane*Math.sqrt(2/3))/Math.sqrt(1/6);return {x:(sum+difference)/2,y:(sum-difference)/2,z:plane};}default:throw Error('Unknown view');}}
export const snap=(n,step)=>Math.round(n/step)*step;
export const rotate=r=>(r%360+360)%360;
export function shape(building){const id=building.id.toLowerCase();if(id.includes('triangle')&&(id.includes('foundation')||id.includes('roof')))return 'triangle';if(id.includes('slanted')||id.includes('stair')||id.includes('diagonalwall')||id.includes('trianglewall')||id.includes('slopedroof'))return 'wedge';if(id.includes('pyramid'))return 'pyramid';return 'box';}
export function defaultEnvelope(building){if(building?.envelope)return building.envelope;const id=(building?.id||'').toLowerCase();let size=id.includes('foundation')?[4,4,.3]:id.includes('wall')?[.25,4,3]:id.includes('roof')?[4,4,.25]:id.includes('stair')?[4,4,3]:[2,2,2];return {min:[-size[0]/2,-size[1]/2,0],max:[size[0]/2,size[1]/2,size[2]],quality:'estimated'};}
export function partEnvelope(part,building){const env=defaultEnvelope(building),size=env.max.map((n,i)=>Math.max(.01,n-env.min[i]));if(!part.size)return env;const center=[(env.min[0]+env.max[0])/2,(env.min[1]+env.max[1])/2,env.min[2]];return {min:[center[0]-part.size[0]/2,center[1]-part.size[1]/2,center[2]],max:[center[0]+part.size[0]/2,center[1]+part.size[1]/2,center[2]+part.size[2]],quality:'custom'};}
export function meshFor(part,building){
 const e=partEnvelope(part,building),[a,b,c]=e.min,[x,y,z]=e.max,kind=shape(building||{id:''});
 let vertices,faces;
 if(kind==='triangle'){vertices=[[a,b,c],[x,b,c],[a,y,c],[a,b,z],[x,b,z],[a,y,z]];faces=[[0,2,1],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]];}
 else if(kind==='wedge'){vertices=[[a,b,c],[x,b,c],[x,y,c],[a,y,c],[a,y,z],[x,y,z]];faces=[[0,3,2,1],[0,1,5,4],[1,2,5],[2,3,4,5],[3,0,4]];}
 else if(kind==='pyramid'){vertices=[[a,b,c],[x,b,c],[x,y,c],[a,y,c],[(a+x)/2,(b+y)/2,z]];faces=[[0,3,2,1],[0,1,4],[1,2,4],[2,3,4],[3,0,4]];}
 else{vertices=[[a,b,c],[x,b,c],[x,y,c],[a,y,c],[a,b,z],[x,b,z],[x,y,z],[a,y,z]];faces=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];}
 const r=part.rotation*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r);
 return {vertices:vertices.map(([vx,vy,vz])=>[part.x+vx*cos-vy*sin,part.y+vx*sin+vy*cos,part.z+vz]),faces};
}
export function insidePolygon([x,y],poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
export function constructionBill(plan,catalog){const buildings=new Map(catalog.buildings.map(b=>[b.id,b])),counts=new Map(),materials=new Map(),techs=new Set(),schematics=new Set(),unknown=[];for(const p of plan.parts){const b=buildings.get(p.building);if(!b){unknown.push(p.building);continue;}counts.set(b.id,(counts.get(b.id)||0)+1);for(const m of b.materials)materials.set(m.item,(materials.get(m.item)||0)+m.count);for(const t of b.technologies)techs.add(t);if(b.schematic)schematics.add(b.schematic);}return {counts,materials,techs,schematics,unknown:[...new Set(unknown)]};}
export function rawBill(materials,recipes){
 const order=[],done=new Set(),issues=new Set();
 function visit(id,path){if(path.has(id)||path.size>20){for(const v of path)issues.add(v);issues.add(id);return;}if(done.has(id))return;const next=new Set(path);next.add(id);for(const m of recipes[id]?.materials||[])visit(m.item,next);done.add(id);order.push(id);}
 for(const id of materials.keys())visit(id,new Set());
 const needs=new Map(materials),out=new Map();
 for(const id of order.reverse()){const count=needs.get(id)||0,r=recipes[id];if(!count)continue;if(!r?.materials?.length||issues.has(id)){out.set(id,count);continue;}const batches=Math.ceil(count/r.output);for(const m of r.materials)needs.set(m.item,(needs.get(m.item)||0)+batches*m.count);}
 return {materials:out,issues:[...issues]};
}
export function technologyRequirements(ids,technologies){const all=new Set(),unknown=new Set(),cycles=new Set();function visit(id,path){if(path.has(id)){cycles.add(id);return;}if(all.has(id))return;const t=technologies[id];if(!t){unknown.add(id);return;}const next=new Set(path);next.add(id);if(t.prerequisite)visit(t.prerequisite,next);all.add(id);}for(const id of ids)visit(id,new Set());return {ids:[...all],unknown:[...unknown],cycles:[...cycles]};}
