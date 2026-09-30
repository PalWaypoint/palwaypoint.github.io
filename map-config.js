// The world extents come from Palworld's DT_WorldMapUIData, as independently
// documented by PalDex. Palworld's HUD coordinates use the conversion also
// documented by palworld-coord:
// worldX = gameY * 459 - 123888; worldY = gameX * 459 + 158000.
// Both source textures are uniformly reduced to 4096 x 4096 without cropping.
const imageSize = 4096;
const sourceUrl = 'https://github.com/catrenelle/PalDex/blob/master/frontend/index.html';

function calibration(terrain) {
  const width = terrain.maxY - terrain.minY;
  const height = terrain.maxX - terrain.minX;
  return {
    originX: (158000 - terrain.minY) * imageSize / width,
    originY: (terrain.maxX + 123888) * imageSize / height,
    pixelsPerX: 459 * imageSize / width,
    pixelsPerY: 459 * imageSize / height
  };
}

const islandsTerrain = {minX:-1099400,maxX:349400,minY:-724400,maxY:724400,path:'./terrain'};
const treeTerrain = {minX:347351.5,maxX:689148.5,minY:-818197,maxY:-476400,path:'./terrain-tree'};

export const mapConfigs = {
  islands: {
    name: 'Palpagos Islands',
    image: './world-map.webp',
    markers: './markers.json',
    terrain: islandsTerrain,
    sourceUrl,
    calibration: calibration(islandsTerrain)
  },
  tree: {
    name: 'World Tree',
    image: './tree-map.webp',
    markers: './tree-markers.json',
    terrain: treeTerrain,
    sourceUrl,
    calibration: calibration(treeTerrain)
  }
};
