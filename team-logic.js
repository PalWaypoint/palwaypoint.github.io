// Independent stat model: Arkive's native-inspection specification (CC BY-NC 4.0).
// Blueprint overrides, per-Pal growth and costs are in team-data.json with build provenance.
const floor=v=>Math.floor(v+1e-9);
export const statLabels={hp:'HP',shotAttack:'Attack',defense:'Defense',craftSpeed:'Work speed'};
export function passiveTotals(build,catalog){
 const totals={MaxHP:0,ShotAttack:0,Defense:0,CraftSpeed:0,MoveSpeed:0,ActiveSkillCoolTime_Decrease:0};
 for(const id of build.passives){const p=catalog.passives.find(p=>p.id===id);if(!p?.always||p.triggers.length)continue;for(const e of p.effects)if(e.target==='ToSelf'&&Object.hasOwn(totals,e.type))totals[e.type]+=e.value;}
 return totals;
}
export function calculateStats(pal,build,catalog){
 const c=catalog.constants,t=passiveTotals(build,catalog),out={};
 for(const stat of Object.keys(statLabels)){
  let base,level;
  if(stat==='craftSpeed'){base=floor(pal.stats[stat]+(pal.friendship[stat]||0)*Math.max(0,build.bond));level=floor(base*c.craftTribeMul);}
  else {base=pal.stats[stat]*(build.awake?c.awakeningMul:1)+(pal.friendship[stat]||0)*Math.max(0,build.bond);level=floor((base*(1+build.iv[stat]*c.talentRate)+(stat==='hp'?c.tribePlusHP:0))*(stat==='hp'?c.levelMulHP:stat==='shotAttack'?c.levelMulAttack:c.levelMulDefense)*build.level+(stat==='hp'?c.constHP:stat==='shotAttack'?c.constAttack:c.constDefense));}
  const condensed=floor(level*(1+build.stars*(stat==='craftSpeed'?c.craftCondenseRate:c.condenseRate)));
  const permanent=floor(condensed*(1+build.souls[stat]*c.soulRate));
  const percent=t[{hp:'MaxHP',shotAttack:'ShotAttack',defense:'Defense',craftSpeed:'CraftSpeed'}[stat]];
  const value=stat==='hp'?floor(permanent*Math.max(.1,1+percent/100)*1000)/1000:floor(permanent*Math.max(.1,1+percent/100));
  out[stat]={base,level,condensed,permanent,percent,value};
 }
 return out;
}
export function upgradeRequirements(pal,current,target,catalog){
 const materials={},add=(id,n)=>{if(n>0)materials[id]=(materials[id]||0)+n;};
 for(const stat of Object.keys(statLabels))for(const r of catalog.souls)if(r.rank>current.souls[stat]&&r.rank<=target.souls[stat])add(r.item,r.count);
 for(const fruit of catalog.fruits){const key={HP:'hp',Attack:'shotAttack',Defense:'defense'}[fruit.stat];add(fruit.item,Math.ceil(Math.max(0,target.iv[key]-current.iv[key])/fruit.gain));}
 const duplicates=catalog.condenser.filter(r=>r.stars>current.stars&&r.stars<=target.stars).reduce((n,r)=>n+r.count,0);
 const exp=Math.max(0,(catalog.exp[target.level]||0)-(catalog.exp[current.level]||0));
 const bond=Math.max(0,catalog.bond.find(r=>r.rank===target.bond).points-catalog.bond.find(r=>r.rank===current.bond).points);
 return {materials,duplicates,exp,bond,awakening:target.awake&&!current.awake,newPassives:target.passives.filter(id=>!current.passives.includes(id)),decreases:['level','stars','bond'].filter(k=>target[k]<current[k]).concat(Object.keys(statLabels).filter(k=>target.souls[k]<current.souls[k]).map(k=>statLabels[k]+' soul rank'),['hp','shotAttack','defense'].filter(k=>target.iv[k]<current.iv[k]).map(k=>statLabels[k]+' IV'),current.awake&&!target.awake?['awakening']:[])};
}
export function skillPreview(skill,build,catalog){const totals=passiveTotals(build,catalog);return {cooldown:Math.max(0,skill.coolTime*(1-totals.ActiveSkillCoolTime_Decrease/100)),levelRequired:skill.level,power:skill.power};}
