// PalMap main-world texture, commit af430c078675083b59408a00efb9c4bd911db5d4.
// The source image was uniformly resized from 8192 x 8192 to 4096 x 4096 without cropping.
// Normalized calibration:
// game X = (-882397 + 1448786 * u) / 459
// game Y = (473273 - 1448786 * v) / 459
export const mapConfig = {
  image: './world-map.webp',
  sourceUrl: 'https://github.com/voidpossum/PalMap/blob/af430c078675083b59408a00efb9c4bd911db5d4/docs/TECHNICAL.md#coordinates',
  calibration: {
    originX: 882397 * 4096 / 1448786,
    originY: 473273 * 4096 / 1448786,
    pixelsPerX: 459 * 4096 / 1448786,
    pixelsPerY: 459 * 4096 / 1448786
  }
};
