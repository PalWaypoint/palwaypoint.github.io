# Direct game-data recovery — September 30, 2026

The recovery reads the user's installed Palworld archive, Steam build **25246127**, without changing the installation. The reader exported **9,982 map packages with zero failures**, then resolved scene-component attachment positions, rotations and scales. All exports and package hashes remain in the local research directory; the runtime ships only normalized records.

The map now has **16,300 source-backed locations**: 15,917 Palpagos Islands and 383 World Tree. This is **2,097 additional locations** compared with the last published independent catalog. Counts measure source coverage, not proof that every actor is always available in play. Alternate dungeon placements, underground locations and conditional encounters are retained where supported by game actors.

Recovered or restored:

- All 21 World Tree awakening locations and the missing Lifmunk effigy. Their original saved completion IDs are preserved. The shared checklist now has 1,155 entries.
- Rare/common fishing classification, 30 absent fishing positions, merchant categories and underground merchants.
- Individually positioned ore, coal, quartz and sulfur nodes, including previously lost child-component positions. The extraction retains source height and actor/package identifiers.
- 122 localized region point markers. The existing 81 surface hover polygons remain available.
- Missing junk pickups and an oil-rig guard position.
- Eleven possible Black Marketeer encounters identified by the game's DarkDealer incident lottery. These are labeled as random encounters, not guaranteed merchants.
- Exact chest pool links for matching game actors. Elemental chest previews offer the game's weighted element selection; loot entries show quantities and loot-slot activation probabilities multiplied by entry weight shares across the full slot. All entries can be viewed. Oil-rig prize selection notes are shown where the class specifies one prize.

No competitor map content supplies these records. Previous coordinates are consulted only for omission comparison and saved-ID reconciliation. Public records are from independently extracted Arkive, PalDB, PalDex and Palworld Save Pal datasets; credits remain in the source license files.

## Remaining recovery work

- **18 cave entrance coordinates** need identification from cave geometry/entry links or a recorded in-game survey. Region volume centers and nearby torches are not substituted for entrances.
- **53 old resource-cluster center positions** do not match the current independently derived cluster markers. Individual resource actors were recovered; the aggregation method still needs reconciliation before claiming those centers are equivalent.
- **Three prior quest-NPC classifications** are not established by the current quest-location table. Their NPC pins are retained; their old category labels are not treated as game evidence.
- **One enemy-camp position** still needs version/identity reconciliation.
- Chest world-appearance probabilities, grade selection, full roll counts and respawn behavior still need gameplay-logic verification. A loot-slot chance is not a world-spawn chance.
- Cave access conditions, comprehensive Pal habitats and World Tree region hover boundaries remain separate tasks. Existing terrain textures are unchanged.

The source datasets and the installed game may have different versions. Public-only records without a matching installed-game actor are retained with their public provenance; the site does not claim complete single-build coverage.

## Reproduce and verify

Workspace-local extraction setup: `research-independent/setup-extractor.ps1`. Reader: `research-independent/game-recovery/reader/`. Normalize the finished exports with `extract-game-actors.cjs`, then apply `recover-game-map.cjs`. Rebuild `wiki-data.json` with `build-wiki.mjs` and the icon archive with `build-waypoint-icons.py`.

`verify-independent-map.mjs` verifies every coordinate against its source, unique progress IDs, actor heights, all 21 restored awakening IDs, category icons and game loot weights/quantities. `verify-wiki.mjs` checks shared progress, capture states and breeding behavior. The capture harness needs a `window.addEventListener` stub when run under Node. Region geometry checks remain unchanged.

Raw exports, SDK files and extracted definitions are ignored by Git. The archive manifest records its SHA-256 and build; the actor audit records each package hash. Source-record and recovery reports are in `research-independent/game-recovery/`.
