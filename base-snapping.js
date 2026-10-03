// Connection candidates use native placement families and measured modular envelopes.
// They do not reproduce Palworld's compiled collision/support validation.
export function structuralSnap(pos,rotation,brush,parts,buildings,visuals,step=.5,enabled=true,exclude=null){
 const grid=n=>Math.round(n/step)*step,plain={x:grid(pos.x),y:grid(pos.y),z:grid(pos.z),rotation,snapped:false};
 if(!enabled)return plain;const kind=id=>visuals.buildings[id]?.strategy||'',family=k=>/Foundation/.test(k)?'floor':/^(Roof|TriangleRoof)$/.test(k)?'ceiling':/^Wall/.test(k)?'wall':'other',f=family(kind(brush));if(f==='other')return plain;
 const candidates=[],rad=Math.PI/180;
 for(const p of parts){if(p.id===exclude||p.size)continue;const b=buildings.get(p.building);if(!b?.envelope)continue;const other=family(kind(p.building)),width=Math.round(Math.max(b.envelope.max[0]-b.envelope.min[0],b.envelope.max[1]-b.envelope.min[1]));if(width<1||width>12)continue;const a=p.rotation*rad,c=Math.cos(a),s=Math.sin(a),add=(x,y,z,r=p.rotation)=>candidates.push({x:p.x+x*c-y*s,y:p.y+x*s+y*c,z:p.z+z,rotation:((r%360)+360)%360,snapped:true});
 // Triangle edges require different connectors and remain grid-only.
 if(/Triangle/.test(kind(brush))||/Triangle/.test(kind(p.building)))continue;
 if(other==='floor'||other==='ceiling'){
  if(f==='floor'||f==='ceiling'){if(f===other||(f==='ceiling'&&other==='floor'))for(const[x,y]of[[width,0],[-width,0],[0,width],[0,-width]])add(x,y,0);}
  if(f==='wall'){add(width/2,0,0);add(-width/2,0,0);add(0,width/2,0,p.rotation+90);add(0,-width/2,0,p.rotation+90);}
 }else if(other==='wall'){
  const h=Math.max(3,Math.round((b.envelope.max[2]-b.envelope.min[2])/3)*3);
  if(f==='wall'){add(0,0,h);add(0,width,0);add(0,-width,0);}
  if(f==='ceiling'){add(width/2,0,h);add(-width/2,0,h);}
 }
 }
 const threshold=Math.max(.75,Math.min(1.5,step*2));const best=candidates.map(c=>({...c,d:Math.hypot(c.x-pos.x,c.y-pos.y,c.z-pos.z)})).sort((a,b)=>a.d-b.d)[0];return best&&best.d<=threshold?best:plain;
}
