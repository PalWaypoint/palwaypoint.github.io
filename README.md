# PalWaypoint

An unofficial browser map focused on the in-game X/Y coordinates at the pointer, with sampled landscape Z elevation. Includes mouse, touch and keyboard zoom/pan controls. No game connection or server credentials are needed.

## Run locally

Serve the repository root with any static HTTP server. All runtime assets are local, including the map image and location data; no external map service or JavaScript dependency is required.

## Location layers

The Locations menu offers 12 toggleable categories: fast travel, watchtowers, boss towers, Alpha Pals, bounty targets, oil rigs, dungeons, journals, NPCs, effigies, schematics, and quest locations. Search filters the enabled categories. Nearby pins group into numbered clusters; click a cluster to zoom or a single pin to see its exact in-game X/Y and a copyable PalDefender command.

The 1,228 main-world marker positions and labels are adapted from [PalDex's extracted Palworld data](https://github.com/catrenelle/PalDex/tree/master/data). The compact `markers.json` omits World Tree positions, which use a separate map and coordinate system. Data credits and the source MIT license are in `MARKER-DATA-LICENSE.txt`. Marker positions are static references, not a live view of dungeon availability, NPC movement, or your personal save progress. Location pins retain the existing terrain-height caveats described below.

## Calibration and attribution

The main-world terrain texture comes from [Void Possum / PalMap](https://github.com/voidpossum/PalMap/tree/af430c078675083b59408a00efb9c4bd911db5d4), source `app/data/T_WorldMap.png`. It was uniformly reduced from 8192×8192 to 4096×4096 without cropping. Palworld artwork belongs to Pocketpair, Inc. PalMap credits PalDB for coordinate conversion research. No PalMap program code was copied.

For normalized image coordinates `u = pixelX / imageWidth`, `v = pixelY / imageHeight`:

```
gameX = (-882397 + 1448786 * u) / 459
gameY = (473273 - 1448786 * v) / 459
```

The constants come from [PalMap's calibration documentation](https://github.com/voidpossum/PalMap/blob/af430c078675083b59408a00efb9c4bd911db5d4/docs/TECHNICAL.md#coordinates). The image is the 1.0 main-world map; the World Tree interior uses a separate coordinate system and is outside this page's scope. Values are rounded to whole in-game units for display. The calibration is community-derived and should be checked against in-game landmarks when replacing the map artwork.

Source image SHA-256: `F02560929CF0F30EE16BA2D2693F9CA65CA5400DB14E13BCA862268092499B62`.

## Ground Z

Ground elevation uses the 256 original lossless main-world DEM tiles from [Palworld Save Pal](https://github.com/oMaN-Rod/palworld-save-pal/tree/69213343cbc42abeef8e68b249efad655f17649a/psp-ui/static/maps/dem/mainmap), pinned to commit `69213343cbc42abeef8e68b249efad655f17649a` (v1.4.3). Each 512×512 tile contributes to the original 8192×8192 height grid. Terrain data is bundled locally; the site does not call a third-party tile service. Attribution: Palworld / Pocketpair, extracted by Palworld Save Pal / oMaN-Rod. The source repository's GPL-3.0 license is preserved in `dist/terrain/LICENSE.txt`; no PSP application code was copied.

Encoding: `Zcm = 512 * red + 2 * green - 50000`. Blue is unused. This is raw Unreal world Z in centimeters, not the in-game X/Y map-unit scale. The interface also shows `Zcm / 100` meters. Sampling uses bilinear interpolation on the source grid, whose horizontal spacing is about 1.77 meters. Heights are approximate landscape values, not live collision or a guarantee of a suitable teleport destination.

The current artwork's raw world coordinates are recovered independently of display rounding:

```
worldX = exactMapY * 459 - 123888
worldY = exactMapX * 459 + 158000
uDEM = (worldY + 724400) / 1448800
vDEM = (349400 - worldX) / 1448800
```

The DEM extent differs slightly from the artwork calibration. Source pixels are sampled at their centers. Tile caching is bounded, preserves PNG channel bytes, and recomputes the current cursor readout after loading so slow responses cannot show a previous position's height.

The source has no coverage/validity mask: ocean or unmeasured landscape can carry the same zero encoding as genuine zero-elevation ground. Zero or mixed zero/nonzero samples therefore show a dash and an explicit ambiguity label instead of claiming confirmed ground. Nonzero samples may still differ on caves, overhangs, rocks, floating/static meshes, buildings and bridges; a landscape heightfield cannot represent all collision surfaces at one X/Y. The World Tree interior is not part of this map. The source does not publish an elevation accuracy bound or the exact extraction game patch.

## PalDefender teleport commands

The readout exposes map X/Y with two decimal places and offers a copyable `/tp X Y Z` command. The command uses sampled raw ground Z plus 150 cm of visible clearance; the separate Ground Z display continues to show terrain height itself. A live user-provided `/getpos` sample `126.42 -398.90 563.41` was compared with this DEM at the same map location: all four neighboring samples are 472 cm. The 91.41 cm difference is consistent with a standing player's reference point above the landscape. This supports using raw centimeter Z for that PalDefender installation rather than converting the command Z to meters.

If terrain Z is ambiguous, still loading, or unavailable, the command intentionally omits Z. [PalDefender's official command documentation](https://github.com/Ultimeit/PalDefender/blob/67883072925766f6e0f2c6be60012b057904d65e/docs/en/Commands/index.md) supports `/tp X Y` and states that it attempts to locate usable ground when Z is omitted. The page labels this fallback. It generates command text only and never connects to or executes commands on a server.

Click/tap a destination to pin the readout before moving to Copy. The pinned position stays registered to the map during zoom/pan. Unpin or Escape resumes live cursor coordinates; showing the whole map also clears the selection.
