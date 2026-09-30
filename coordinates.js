// The calibration constants belong to the specific source image, not its display size.
export function pixelToGame(px, py, calibration) {
  return {x: (px - calibration.originX) / calibration.pixelsPerX,
    y: (calibration.originY - py) / calibration.pixelsPerY};
}
export function gameToPixel(x, y, calibration) {
  return {x: calibration.originX + x * calibration.pixelsPerX,
    y: calibration.originY - y * calibration.pixelsPerY};
}
export function screenToPixel(x, y, camera) {
  return {x: (x - camera.x) / camera.scale, y: (y - camera.y) / camera.scale};
}
