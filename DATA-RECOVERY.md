# Direct game-data recovery — October 1, 2026

The recovery reads the user's installed Palworld archive, Steam build **25246127**, without changing the installation. The reader exported **9,982 map packages with zero failures**, then resolved scene-component attachment positions, rotations and scales. All exports and package hashes remain in the local research directory; the runtime ships only normalized records.

The local map now has **16,401 source-backed locations**: 16,018 Palpagos Islands and 383 World Tree. This is **2,198 additional locations** compared with the independent catalog before direct recovery, and 101 more than the published September 30 recovery. Counts measure source coverage, not proof that every actor is always available in play. Alternate dungeon placements, underground locations and conditional encounters are retained where supported by game actors. The October 1 additions are locally validated; deployment status is recorded separately.

Recovered or restored:

- All 21 World Tree awakening locations and the missing Lifmunk effigy. Their original saved completion IDs are preserved. The shared checklist now has 1,173 entries.
- Rare/common fishing classification, 30 absent fishing positions, merchant categories and underground merchants.
- Individually positioned ore, coal, quartz and sulfur nodes, including previously lost child-component positions. The extraction retains source height and actor/package identifiers.
- 122 localized region point markers. The existing 81 surface hover polygons remain available.
- Missing junk pickups and an oil-rig guard position.
- Eleven possible Black Marketeer encounters identified by the game's DarkDealer incident lottery. These are labeled as random encounters, not guaranteed merchants.
- Exact chest pool links for matching game actors. Elemental chest previews offer the game's weighted element selection; loot entries show quantities and loot-slot activation probabilities multiplied by entry weight shares across the full slot. All entries can be viewed. Oil-rig prize selection notes are shown where the class specifies one prize.

No competitor map content supplies these records. Previous coordinates are consulted only for omission comparison and saved-ID reconciliation. Public records are from independently extracted Arkive, PalDB, PalDex and Palworld Save Pal datasets; credits remain in the source license files.

## Remaining recovery work

- Cave entrance positions are now recovered and added: 18 approximate entrance areas, including Abandoned Mineshaft. Their access conditions and exact visible mouths remain unverified in gameplay.
- **One prior quest-NPC classification** remains unconfirmed: Cheerful Ore Researcher (`U_Yamishima_guide3`), at approximately in-game (-1,063, -1,427) on Feybreak. Its talk-flow table is keyed by the unique-NPC ID rather than its alternate TalkBPClass name. After following the correct reference, the exported graph contains fixed dialogue and a talk-count branch, with no validated quest-order, progress or completion nodes. Its NPC pin is present; it remains an ordinary NPC. Earlier recovery notes incorrectly named BountyNavigator_Yamijima_2, which is a different NPC.
- **One enemy-camp position** still needs version/identity reconciliation.
- Chest world-appearance probabilities, grade selection, full roll counts and respawn behavior still need gameplay-logic verification. A loot-slot chance is not a world-spawn chance.
- Cave access conditions and World Tree region hover boundaries remain separate tasks. The installed named region triggers do not supply World Tree surface boundaries. Audio-volume names are insufficient evidence for substituting region names.
- Wild spawn/habitat records now cover 265 of the 288 catalog Pals. The remaining 23 have no matching Common/Field placement or Paldeck habitat in these tables; that does not establish that they are unobtainable. Boss, dungeon, event and breeding acquisition remain separate sources.

The source datasets and the installed game may have different versions. Public-only records without a matching installed-game actor are retained with their public provenance; the site does not claim complete single-build coverage.

## October 1 recovery using Arkive's extraction methods

The [Arkive Palworld extractor](https://github.com/arkive-games/arkive/tree/master/tools/apps/palworld) provides a practical reference for table joins and known actor classes. We applied those methods to our own installed-build exports using the existing CUE4Parse reader. Another 1,816 selected packages exported without failures. No competitor content is used as an input to new records.

| Category | Result and method | Remaining limitation |
| --- | --- | --- |
| Resource clusters | Added 83 centers from resource nodes sharing an actual editor placement attachment group. Every center retains its member actor IDs and mean X/Y/Z. | Of 53 comparison centers, 40 match within 2 cm and 13 shift with current attachment membership. Historical membership equivalence is not assumed. Individual resource nodes remain available. |
| Quest NPCs | Joined unique-NPC talk-flow references to exported quest-order/progress/completion graph nodes and validated their quest IDs against DT_PalQuestData. Reclassified 16 additional NPC pins, including two of the three disputed classifications. | One guide NPC lacks supporting quest nodes; no speculative classification. |
| Wild Pal spawns | Joined DT_PalWildSpawner to DT_PalSpawnerPlacement, keeping level, time, weather, radius, pack range and row weight. Recovered 58,979 weighted records for 265 Pals. | These are pool rows at placements, not 58,979 distinct spawn locations or a guarantee of encounters. Conditions must be considered before deriving a probability. |
| Paldeck habitats | Imported DT_PaldexDistributionData day/night clouds for both maps, 529 Pal/map/time clouds. Added a Map button beside each Pal, Day/Night/Clear controls and profile links. | Rendering samples at most 800 points per cloud; full exports and raw point counts remain in research. Clouds describe the Paldeck display, not exact traversable area boundaries. |
| Chest loot | Existing 2,994 validated loot entries retain exact pool/slot joins and quantity ranges. Arkive's item-lottery extraction supports these joins. | World appearance chance, native grade/roll selection and respawn defaults are not established by table odds or exported native class references. |
| Cave entrances | Added 18 entrance areas from game geometry: nine authored tunnel-floor path endpoints, three baked desert-floor start caps and six Feybreak corridor openings. Seventeen names join to game localization. | Positions are approximate and have not been checked in gameplay; approach endpoints can precede the visible rock mouth. One Feybreak cave has no confirmed localized name. No region centers or competitor coordinates generate these pins. |
| World Tree hover regions | No usable named World Tree surface-trigger coverage recovered. | Obtain named boundary geometry from game assets, or record region transitions in game. Do not infer names from ambient audio volumes. |
| Enemy camp | One prior position remains unresolved. | Reconcile the installed build's camp actor/instance identity and verify in game. A nearby NPC spawner is not enough. |

The table recovery and map controls passed local checks. All 16,401 static coordinates match independently retained source records; all 83 derived centers match the mean of their actual source actors; every new spawn row matches its placement and lottery row. Browser checks covered day/night selection, both maps, missing-habitat messaging, clearing, profile links and console errors. Capture persistence and all 1,173 checklist IDs remain intact.

## October 1 full cave-asset inspection

Added **18 cave entrances** under their own map filter, with an **Explored** checkbox synchronized with the shared checklist. Existing 170 Dungeon markers and completion IDs remain intact. The omitted cave in the supplied list was **Abandoned Mineshaft**. One unnamed tunnel is labeled **Feybreak Cave**.

Nine older caves retain authored spline control points for their tunnel floors. Their surface approach endpoints are transformed through the complete component attachment chain and associated with independently localized entrance regions. Three desert caves use the same baked tunnel-floor mesh in different placements; the two triangles and four vertices of its start cap identify the independent approach position. Six Feybreak tunnels have two closed corridor boundary loops and companion chambers; the end farther from the chamber locates the outer opening. All methods read installed build 25246127 only. Supplied link positions selected investigation areas; they are absent from the recovery inputs.

These are **approximate entrance areas**, not a claim of gameplay verification or an exact rock-mouth survey. The approach path can start before the visible opening. Access conditions remain unresolved. Source records preserve control points, cap/boundary vertices, transforms, source-package hashes and localized table joins.

[Independent per-location report](research-independent/game-recovery/cave-inspection/CAVE-VALIDATION.md) lists all names, recovered coordinates and methods. [Geometry plan views](research-independent/game-recovery/cave-inspection/cave-opening-geometry.png) show the six Feybreak corridors and chambers.

After the selected map, spline-blueprint and mesh exports, run recover-cave-openings.cjs followed by recover-cave-entrances.cjs. The latter discovers path components and baked floor placements, reads game-name tables, generates cave-source-records.json and adds the 18 runtime/checklist entries. Run verify-cave-entrances.cjs, verify-cave-validation.cjs and verify-independent-map.mjs.

## Reproduce and verify

Workspace-local extraction setup: `research-independent/setup-extractor.ps1`. Reader: `research-independent/game-recovery/reader/`. Normalize the finished exports with `extract-game-actors.cjs`, then apply `recover-game-map.cjs`. Rebuild `wiki-data.json` with `build-wiki.mjs` and the icon archive with `build-waypoint-icons.py`.

For phase two, after rebuilding phase-one records, run `audit-recovery-options.cjs`, then `recover-spawns-and-clusters.cjs`. Export selected definitions listed in `game-recovery/selected-packages.json` and `selected-extra.json` using the reader's `selected` mode first if they are absent. Phase-two output includes pal-spawns.json, wiki spawn summaries and phase-two-report.json. Running the wiki builder afterwards replaces these summaries, so apply phase two after the wiki builder, then run recover-cave-entrances.cjs last. `verify-habitats.mjs` checks every spawn row, deterministic habitat sample, cluster member, quest-node join and map calibration. The report compares changes with the preserved published baseline so repeated recovery runs retain accurate counts.

`verify-independent-map.mjs` verifies every coordinate against its source, unique progress IDs, actor heights, all 21 restored awakening IDs, category icons and game loot weights/quantities. `verify-wiki.mjs` checks shared progress, capture states and breeding behavior. `test-captures.mjs` includes its browser stubs. Region geometry checks remain unchanged.

Raw exports, SDK files and extracted definitions are ignored by Git. The archive manifest records its SHA-256 and build; the actor audit records each package hash. Source-record and recovery reports are in `research-independent/game-recovery/`.
