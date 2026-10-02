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

// An explicit parents-only model; no claim about final random/innate traits or IVs.
const choose=(n,k)=>{if(k<0||k>n)return 0;let v=1;for(let i=1;i<=Math.min(k,n-k);i++)v=v*(n-i+1)/i;return v;};
export function inheritanceOdds(a,b,wanted,weights){
 for(const list of [a,b,wanted])if(!Array.isArray(list)||list.length>4||new Set(list).size!==list.length)throw Error('Choose up to four distinct traits per selection.');
 if(weights.length!==4||weights.some(w=>!Number.isFinite(w)||w<0)||!weights.reduce((s,w)=>s+w,0))throw Error('Inheritance weights are unavailable.');
 const pool=[...new Set([...a,...b])],missing=wanted.filter(id=>!pool.includes(id)),denom=weights.reduce((s,w)=>s+w,0);
 let inclusive=0,exactInherited=0;const distribution={};
 weights.forEach((w,i)=>{const n=Math.min(i+1,pool.length),p=w/denom;distribution[n]=(distribution[n]||0)+p;if(!missing.length){inclusive+=p*choose(pool.length-wanted.length,n-wanted.length)/choose(pool.length,n);if(n===wanted.length)exactInherited+=p/choose(pool.length,n);}});
 return {pool,missing,inclusive,exactInherited,distribution};
}
export function eggConfidence(p,confidence=.95){if(p<=0)return null;if(p>=1)return 1;return Math.ceil(Math.log1p(-confidence)/Math.log1p(-p));}
export function successWithin(p,n){return p>=1?1:p<=0?0:-Math.expm1(n*Math.log1p(-p));}

const previewTypes=new Set(['MaxHP','ShotAttack','Defense','CraftSpeed','MoveSpeed','MaxSP','ActiveSkillCoolTime_Decrease','MaxInventoryWeight','JumpCount_Increase','RideJumpCount_Increase']);
function invoked(invoke,role){return invoke.includes('Always')||invoke.some(v=>({InOtomo:role!=='base',ActiveOtomo:['active','riding'].includes(role),Riding:role==='riding',Reserve:role==='reserve',InBaseCamp:role==='base',Worker:role==='base'}[v]));}
export function teamBuffPreview(slots,catalog,options={}){
 const mode=options.mode||'party',active=options.active??0,gear=options.gear===true;
 const roles=slots.map((s,i)=>mode==='base'?'base':i===active?(mode==='riding'?'riding':'active'):'reserve');
 const contributions=[],omitted=[];
 const add=(receiver,source,e,skill,partner=false)=>{
  const rule=catalog.effectConditions?.[e.type]||{};
  if(!previewTypes.has(e.type)||!Number.isFinite(e.value)){omitted.push({source,skill:skill.name||skill.id,type:e.type,reason:'Special effect is listed separately'});return;}
  contributions.push({receiver,source,type:e.type,value:e.value,name:skill.name||skill.id,highest:rule.bIsHighestOnly===true,fixed:rule.bIsFixedValue===true,group:partner&&!skill.stackSameSpecies?'partner:'+slots[source].pal+':'+e.type:null});
 };
 for(let source=0;source<slots.length;source++){
  const s=slots[source];if(!s||!catalog.pals[s.pal])continue;
  for(const id of s.target.passives){const p=catalog.passives.find(p=>p.id===id);if(!p)continue;if(p.triggers.length){omitted.push({source,skill:p.name,reason:'Requires an additional trigger'});continue;}if(!invoked(p.invoke,roles[source]))continue;
   for(const e of p.effects){if(['ToSelf','ToSelfAndTrainer'].includes(e.target))add(source,source,e,p);if(mode!=='base'&&['ToTrainer','ToSelfAndTrainer'].includes(e.target))add('player',source,e,p);}
  }
  const pal=catalog.pals[s.pal];
  for(const skill of pal.partner.effects[s.target.stars]||[]){
   if(!invoked(skill.invoke,roles[source]))continue;
   if(pal.partner.items.length&&!gear){omitted.push({source,skill:skill.id,reason:'Required Pal gear is not assumed equipped'});continue;}
   const p=skill.parameters;
   if(!p||skill.triggers?.length||p.DelayTime||p.WorkType!=='EPalWorkType::None'||p.MapObjectId.length||p.ItemId.length||p.ItemParam.ItemTypeA!=='EPalItemTypeA::None'||p.ItemParam.ItemTypeB!=='EPalItemTypeB::None'||p.ItemParam.ItemIds.length||p.ItemParam.ExcludedItemIds.length||p.ItemParam.WeaponType!=='EPalWeaponType::None'||p.ItemParam.WeaponTypes.length||p.ItemParam.bMeleeOnly||p.OtherOtomoConditionParam.PalTribeIds.length||p.OtherOtomoConditionParam.TargetElementTypes.length||p.OtherOtomoConditionParam.TargetElementType!=='EPalElementType::None'||p.TriggerParam.TargetTribeIds.length){omitted.push({source,skill:skill.id,reason:'Additional equipment, work or recipient conditions need verification'});continue;}
   for(const e of skill.effects){
    if(e.target==='ToTrainer'){if(mode!=='base')add('player',source,e,skill,true);continue;}
    if(e.target!=='ToSelf'){omitted.push({source,skill:skill.id,type:e.type,reason:'Recipient rule needs verification'});continue;}
    for(let dest=0;dest<slots.length;dest++){
     const target=slots[dest],recipient=target&&catalog.pals[target.pal];if(!recipient||(!skill.others&&dest!==source)||(skill.excludeSelf&&dest===source))continue;
     if(skill.element!=='None'&&!recipient.elements?.includes(skill.element))continue;
     if(p.TargetElementType!=='EPalElementType::None'&&!recipient.elements?.includes(p.TargetElementType.split('::').pop()))continue;
     if(p.PalTribeIds.length&&!p.PalTribeIds.includes(target.pal))continue;
     add(dest,source,e,skill,true);
    }
   }
  }
 }
 const totals={};
 for(const receiver of [...slots.map((s,i)=>s?i:null).filter(i=>i!==null),'player']){
  const result={};for(const type of previewTypes){let list=contributions.filter(c=>c.receiver===receiver&&c.type===type);if(!list.length)continue;
   const grouped=new Map();list=list.filter(c=>!c.group||!grouped.has(c.group)?(c.group&&grouped.set(c.group,c),true):false);
   // Choose the strongest rank of each non-stacking same-species partner source.
   list=list.map(c=>c.group?contributions.filter(x=>x.receiver===receiver&&x.group===c.group).reduce((a,b)=>b.value>a.value?b:a,c):c);
   const value=list.some(c=>c.highest)?Math.max(...list.map(c=>c.value)):list.reduce((v,c)=>v+c.value,0);
   result[type]={value,fixed:list.some(c=>c.fixed),sources:list};
  }totals[receiver]=result;
 }
 const stats=slots.map((s,i)=>{if(!s||!catalog.pals[s.pal])return null;const baseline=calculateStats(catalog.pals[s.pal],s.target,catalog),out={};for(const k of Object.keys(statLabels)){const pct=totals[i][{hp:'MaxHP',shotAttack:'ShotAttack',defense:'Defense',craftSpeed:'CraftSpeed'}[k]]?.value||0;out[k]=k==='hp'?floor(baseline[k].permanent*Math.max(.1,1+pct/100)*1000)/1000:floor(baseline[k].permanent*Math.max(.1,1+pct/100));}return out;});
 return {totals,stats,contributions,omitted,roles};
}
