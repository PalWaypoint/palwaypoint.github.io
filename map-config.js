// PalMap main-world texture, commit af430c078675083b59408a00efb9c4bd911db5d4.
// The source image was uniformly resized from 8192 x 8192 to 4096 x 4096 without cropping.
// Normalized calibration:
// game X = (-882397 + 1448786 * u) / 459
// game Y = (473273 - 1448786 * v) / 459
export const mapConfigs = {
  islands: {
  name: 'Palpagos Islands',
  image: './world-map.webp',
  markers: './markers.json',
  terrain: {minX:-1099400,maxX:349400,minY:-724400,maxY:724400,path:'./terrain'},
  sourceUrl: 'https://github.com/voidpossum/PalMap/blob/af430c078675083b59408a00efb9c4bd911db5d4/docs/TECHNICAL.md#coordinates',
  calibration: {
    originX: 882397 * 4096 / 1448786,
    originY: 473273 * 4096 / 1448786,
    pixelsPerX: 459 * 4096 / 1448786,
    pixelsPerY: 459 * 4096 / 1448786
  }
  },
  tree: {
  name: 'World Tree',
  image: './tree-map.webp',
  markers: './tree-markers.json',
  terrain: {minX:347351.5,maxX:689148.5,minY:-818197,maxY:-476400,path:'./terrain-tree'},
  sourceUrl: 'https://github.com/voidpossum/PalMap/blob/af430c078675083b59408a00efb9c4bd911db5d4/docs/TECHNICAL.md#coordinates',
  calibration: {
    originX: 976197 * 4096 / 341798,
    originY: 813036 * 4096 / 341798,
    pixelsPerX: 459 * 4096 / 341798,
    pixelsPerY: 459 * 4096 / 341798
  }
  }
};
