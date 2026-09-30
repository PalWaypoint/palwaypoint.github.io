# PalWaypoint

An unofficial browser map focused on the in-game X/Y coordinates at the pointer, with sampled landscape Z elevation. Includes mouse, touch and keyboard zoom/pan controls. No game connection or server credentials are needed.

## Run locally

Unzip `marker-icons.zip` into the repository root, then serve the root with any static HTTP server. GitHub Pages unzips the icons during deployment. All runtime assets are local, including map images, location data and icons; no external map service or JavaScript dependency is required.

## Location layers

The collapsible Locations sidebar has 77 marker types across both maps in nine groups: Collectibles, Treasure, Eggs, Enemies, Fishing, Locations, Mine, NPCs, and Resource. Types with no locations on the selected map are hidden, so World Tree-only entries do not appear as empty Palpagos Islands rows. Each type has a distinct icon; some individual markers use a specific Pal portrait or treasure icon. Group and global toggles control visibility. Search filters the enabled markers. Nearby pins group into numbered clusters; click a cluster to zoom or a single pin to see its exact in-game X/Y and a copyable PalDefender command. The map switcher shows Palpagos Islands or World Tree, each with its own artwork, terrain heights, and location pins.

The 14,011 Palpagos Islands and 379 World Tree marker positions, labels, type list, and icons are adapted from the public [PalMap game-data export](https://palmap.app/about), downloaded September 30, 2026. Marker positions are static references, not a live view of dungeon availability, NPC movement, or your personal save progress. The earlier PalDex-derived 1,228/97 marker set was replaced; the new data is not claimed to be covered by PalDex's MIT license. See `MARKER-DATA-LICENSE.txt` for attribution. Location pins retain the existing terrain-height caveats described below.

## Progress and chest loot

Selecting a fast travel point, watchtower, boss tower, Skyland warp altar, Alpha Pal, bounty, ancient ruin, journal, effigy, or dungeon shows an appropriately labelled status checkbox. Progress is saved in this browser's local storage and stays on this device; clearing browser data removes it. The sidebar shows completed/total counts for trackable types and can hide completed pins. Progress is per map location, not a connection to a Palworld save or server.

Chest details show the top possible items, approximate drop percentages per opening, tier and estimated respawn time from [PalMap's chest-tip export](https://palmap.app/chest-loot). These percentages describe item drops, not the probability that a chest appears at the location. The source does not give that latter probability. Chest details and item icons are bundled locally with the site.

## Calibration and attribution

The main-world and World Tree textures come from [Void Possum / PalMap](https://github.com/voidpossum/PalMap/tree/af430c078675083b59408a00efb9c4bd911db5d4), sources `app/data/T_WorldMap.png` and `app/data/T_TreeMap.png`. Both were uniformly reduced from 8192×8192 to 4096×4096 without cropping. Palworld artwork belongs to Pocketpair, Inc. PalMap credits PalDB for coordinate conversion research. No PalMap program code was copied.

For normalized image coordinates `u = pixelX / imageWidth`, `v = pixelY / imageHeight`:

```
gameX = (-882397 + 1448786 * u) / 459
gameY = (473273 - 1448786 * v) / 459
```

The constants come from [PalMap's calibration documentation](https://github.com/voidpossum/PalMap/blob/af430c078675083b59408a00efb9c4bd911db5d4/docs/TECHNICAL.md#coordinates). World Tree artwork uses the published world bounding box (world X 347350 to 689148; world Y -818197 to -476399) and the same global in-game coordinate conversion as the islands. This keeps PalDefender's X/Y frame consistent when switching maps. The calibration is community-derived and should be checked against in-game landmarks when replacing the map artwork.

Source image SHA-256: `F02560929CF0F30EE16BA2D2693F9CA65CA5400DB14E13BCA862268092499B62`.

## Ground Z

Ground elevation uses the 256 original lossless DEM tiles for each map from [Palworld Save Pal](https://github.com/oMaN-Rod/palworld-save-pal/tree/69213343cbc42abeef8e68b249efad655f17649a/psp-ui/static/maps/dem), pinned to commit `69213343cbc42abeef8e68b249efad655f17649a` (v1.4.3). Each 512×512 tile contributes to an 8192×8192 height grid. Terrain data is bundled locally; the site does not call a third-party tile service. Attribution: Palworld / Pocketpair, extracted by Palworld Save Pal / oMaN-Rod. The source repository's GPL-3.0 license is preserved in both terrain archives; no PSP application code was copied.

Encoding: `Zcm = 512 * red + 2 * green - 50000`. Blue is unused. This is raw Unreal world Z in centimeters, not the in-game X/Y map-unit scale. The interface also shows `Zcm / 100` meters. Sampling uses bilinear interpolation on the source grid, whose horizontal spacing is about 1.77 meters. Heights are approximate landscape values, not live collision or a guarantee of a suitable teleport destination.

The current artwork's raw world coordinates are recovered independently of display rounding:

```
worldX = exactMapY * 459 - 123888
worldY = exactMapX * 459 + 158000
uDEM = (worldY + 724400) / 1448800
vDEM = (349400 - worldX) / 1448800
```

The DEM extent differs slightly from the artwork calibration. Source pixels are sampled at their centers. Tile caching is bounded, preserves PNG channel bytes, and recomputes the current cursor readout after loading so slow responses cannot show a previous position's height.

The source has no coverage/validity mask: ocean or unmeasured landscape can carry the same zero encoding as genuine zero-elevation ground. Zero or mixed zero/nonzero samples therefore show a dash and an explicit ambiguity label instead of claiming confirmed ground. Nonzero samples may still differ on caves, overhangs, rocks, floating/static meshes, buildings and bridges; a landscape heightfield cannot represent all collision surfaces at one X/Y. The source does not publish an elevation accuracy bound or the exact extraction game patch.

## PalDefender teleport commands

The readout exposes map X/Y with two decimal places and offers a copyable `/tp X Y Z` command. The command uses sampled raw ground Z plus 150 cm of visible clearance; the separate Ground Z display continues to show terrain height itself. A live user-provided `/getpos` sample `126.42 -398.90 563.41` was compared with this DEM at the same map location: all four neighboring samples are 472 cm. The 91.41 cm difference is consistent with a standing player's reference point above the landscape. This supports using raw centimeter Z for that PalDefender installation rather than converting the command Z to meters.

If terrain Z is ambiguous, still loading, or unavailable, the command intentionally omits Z. [PalDefender's official command documentation](https://github.com/Ultimeit/PalDefender/blob/67883072925766f6e0f2c6be60012b057904d65e/docs/en/Commands/index.md) supports `/tp X Y` and states that it attempts to locate usable ground when Z is omitted. The page labels this fallback. It generates command text only and never connects to or executes commands on a server.

Click/tap a destination to pin the readout before moving to Copy. The pinned position stays registered to the map during zoom/pan. Unpin or Escape resumes live cursor coordinates; showing the whole map also clears the selection.
