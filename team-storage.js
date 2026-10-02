export const teamStorageKey='palwaypoint-teams-v1';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const id=v=>typeof v==='string'&&v.length>0&&v.length<=256&&!['__proto__','constructor','prototype'].includes(v);
export function emptyBuild(level=1){return {level,stars:0,bond:0,awake:false,iv:{hp:0,shotAttack:0,defense:0},souls:{hp:0,shotAttack:0,defense:0,craftSpeed:0},passives:[],skills:[]};}
export function newTeam(){return {id:crypto.randomUUID(),name:'New team',slots:Array(5).fill(null)};}
export function validateTeams(value){
 const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const list=(v,max)=>Array.isArray(v)&&v.length<=max&&v.every(id)&&new Set(v).size===v.length;
 const build=b=>plain(b)&&int(b.level,1,100)&&int(b.stars,0,4)&&int(b.bond,0,10)&&typeof b.awake==='boolean'&&plain(b.iv)&&['hp','shotAttack','defense'].every(k=>int(b.iv[k],0,100))&&plain(b.souls)&&['hp','shotAttack','defense','craftSpeed'].every(k=>int(b.souls[k],0,20))&&list(b.passives,4)&&list(b.skills,3);
 if(!Array.isArray(value)||value.length>50||value.some(t=>!plain(t)||!id(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>100||!Array.isArray(t.slots)||t.slots.length!==5||t.slots.some(s=>s!==null&&(!plain(s)||!id(s.pal)||!build(s.current)||!build(s.target))))||new Set(value.map(t=>t.id)).size!==value.length)throw Error('The backup contains invalid saved teams.');
 return value.map(t=>({id:t.id,name:t.name,slots:t.slots.map(s=>s===null?null:{pal:s.pal,current:copyBuild(s.current),target:copyBuild(s.target)})}));
}
function copyBuild(b){return {level:b.level,stars:b.stars,bond:b.bond,awake:b.awake,iv:{hp:b.iv.hp,shotAttack:b.iv.shotAttack,defense:b.iv.defense},souls:{hp:b.souls.hp,shotAttack:b.souls.shotAttack,defense:b.souls.defense,craftSpeed:b.souls.craftSpeed},passives:[...b.passives],skills:[...b.skills]};}
export function readTeams(storage){const raw=storage.getItem(teamStorageKey);if(raw===null)return [];let v;try{v=JSON.parse(raw);}catch{throw Error('Saved teams could not be read. Export a backup before clearing site data.');}return validateTeams(v);}
export function mergeTeams(current,incoming){const out=current.map(t=>structuredClone(t));for(const team of incoming){const same=out.find(t=>t.id===team.id);if(!same)out.push(team);else if(JSON.stringify(same)!==JSON.stringify(team))out.push({...team,id:crypto.randomUUID(),name:(team.name+' (imported)').slice(0,100)});}return validateTeams(out);}
export function writeTeams(storage,teams){const value=validateTeams(teams);storage.setItem(teamStorageKey,JSON.stringify(value));return value;}
