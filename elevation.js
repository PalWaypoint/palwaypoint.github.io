// Samples the original lossless landscape DEM; the visible map is never used to infer height.
// DEM source: Palworld Save Pal, commit 69213343cbc42abeef8e68b249efad655f17649a.
const SIZE = 8192;
const TILE_SIZE = 512;
const MAX_CACHE = 16;

export function worldToTerrainPixel(worldX, worldY) {
  return {x:(worldY + 724400) / 1448800 * SIZE - .5,
    y:(349400 - worldX) / 1448800 * SIZE - .5};
}
export function decodeHeight(red, green) {return red * 512 + green * 2 - 50000;}

export class TerrainElevation {
  constructor(onReady) {
    this.onReady = onReady;
    this.cache = new Map();
    this.pending = new Set();
    this.failed = new Map();
    this.queue = [];
    this.active = 0;
  }
  getTile(x,y) {
    const key=`${x}/${y}`;
    const tile=this.cache.get(key);
    if(tile){this.cache.delete(key);this.cache.set(key,tile);return {state:'ready',tile};}
    const failedAt=this.failed.get(key);
    if(failedAt&&Date.now()-failedAt<30000)return {state:'error'};
    if(!this.pending.has(key)){this.pending.add(key);this.queue.push({key,x,y});this.pump();}
    return {state:'loading'};
  }
  pump() {
    while(this.active<4&&this.queue.length){const request=this.queue.shift();this.active++;
      this.loadTile(request).finally(()=>{this.active--;this.pending.delete(request.key);this.pump();this.onReady();});
    }
  }
  async loadTile({key,x,y}) {
    let bitmap;
    try {
      const response=await fetch(`./terrain/4/${x}/${y}.png`);
      if(!response.ok)throw new Error('Terrain tile unavailable');
      bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none'});
      if(bitmap.width!==TILE_SIZE||bitmap.height!==TILE_SIZE)throw new Error('Unexpected terrain resolution');
      const surface=document.createElement('canvas');surface.width=TILE_SIZE;surface.height=TILE_SIZE;
      const context=surface.getContext('2d',{willReadFrequently:true});
      context.drawImage(bitmap,0,0);
      const rgba=context.getImageData(0,0,TILE_SIZE,TILE_SIZE).data;
      const codes=new Uint16Array(TILE_SIZE*TILE_SIZE);
      for(let index=0;index<codes.length;index++)codes[index]=rgba[index*4]*256+rgba[index*4+1];
      this.failed.delete(key);this.cache.set(key,codes);
      while(this.cache.size>MAX_CACHE)this.cache.delete(this.cache.keys().next().value);
    } catch {this.failed.set(key,Date.now());}
    finally {bitmap?.close();}
  }
  atPixel(x,y) {
    const tileX=Math.floor(x/TILE_SIZE),tileY=Math.floor(y/TILE_SIZE);
    const result=this.getTile(tileX,tileY);
    if(result.state!=='ready')return result;
    const z=result.tile[(y%TILE_SIZE)*TILE_SIZE+x%TILE_SIZE]*2-50000;
    // The source has no validity mask and encodes both sea-level fill and potentially
    // real zero-elevation terrain as zero. Do not present that ambiguous value as ground.
    return z===0?{state:'unknown'}:{state:'ready',z};
  }
  sample(worldX,worldY) {
    if(!Number.isFinite(worldX)||!Number.isFinite(worldY))return {state:'unknown'};
    const point=worldToTerrainPixel(worldX,worldY);
    if(point.x<-.5||point.y<-.5||point.x>SIZE-.5||point.y>SIZE-.5)return {state:'unknown'};
    const x=Math.max(0,Math.min(SIZE-1,point.x)),y=Math.max(0,Math.min(SIZE-1,point.y));
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(SIZE-1,x0+1),y1=Math.min(SIZE-1,y0+1);
    const dx=x-x0,dy=y-y0;
    const samples=[[x0,y0,(1-dx)*(1-dy)],[x1,y0,dx*(1-dy)],[x0,y1,(1-dx)*dy],[x1,y1,dx*dy]].filter(([, ,weight])=>weight>1e-10).map(([px,py,weight])=>({...this.atPixel(px,py),weight}));
    if(samples.some(s=>s.state==='error'))return {state:'error'};
    if(samples.some(s=>s.state==='loading'))return {state:'loading'};
    if(samples.some(s=>s.state!=='ready'))return {state:'unknown'};
    return {state:'ready',z:samples.reduce((total,s)=>total+s.z*s.weight,0)};
  }
}
