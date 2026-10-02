# Map coverage audit — September 30, 2026

**October 1 status:** The inventory below is the original comparison backlog, not the current missing inventory. Direct installed-build recovery now produces 16,401 static pins. Resource-node positions, 83 source-derived cluster centers, fishing distinctions, merchant types, awakening encounters, effigies and region points have been recovered. Sixteen additional quest-NPC classifications are supported by actual quest graph nodes; two of the three disputed NPCs are among them. Day/night habitat and field-spawn tables cover 265 Pals. All 18 cave entrance areas are added from installed-game geometry, including Abandoned Mineshaft. Remaining unresolved comparison records are one enemy camp and one unconfirmed quest-NPC label. Chest world-spawn/respawn behavior, cave access and World Tree named hover boundaries also remain unverified. See [DATA-RECOVERY.md](DATA-RECOVERY.md) for methods and evidence. These October 1 changes retain independent source evidence.

Baseline: deployed commit 240a5169382e5b66ff9ebc815d828084d1058194 (14,011 main + 379 tree). Current: f43a2e515268b8a70a1dad4329fca217886832e6 (13,841 main + 362 tree). The old version is an audit reference only; none of its content is a source for new live records.

Full location-level inventory: research-independent/map-omissions-audit.json. Reproduce with research-independent/audit-map-omissions.cjs. It compares independently sourced coordinates with previous coordinates using a two Unreal-unit tolerance. Failure to match is a reconciliation task, not proof that the game location was removed. New locations and old locations are counted independently; net totals do not establish completeness.

## Location reconciliation backlog

| Type | Previous positions without a current equivalent | Recovery |
| --- | ---: | --- |
| World Tree awakening encounters | 21 | All 21 have independent PalDB candidates; map Awakening to the encounter category, validate labels and restore saved IDs. |
| Cave entrances | 18 recovered | Game-derived approach endpoints and mesh openings; approximate positions, access conditions and exact visible mouths still unverified in gameplay. |
| Ore nodes | 137 | Compare current game resource actors against old locations; 18 additional old Ore points already exist as Ore Cluster. |
| Coal nodes | 7 | Compare game actors; nine additional old Coal points are Coal Cluster. |
| Pure quartz nodes | 6 | Compare game actors; six additional points are Pure Quartz Cluster. |
| Sulfur nodes | 16 | Compare game actors; 23 additional points are Sulfur Cluster. |
| Ore cluster positions | 22 | Audit centroid versus spawner coordinates; new catalog has 70 clusters, so these are not proven missing clusters. |
| Coal cluster positions | 21 | Same position/centroid reconciliation; new catalog has 56. |
| Pure quartz cluster positions | 6 | Same reconciliation; new catalog has 38. |
| Sulfur cluster positions | 4 | Same reconciliation; new catalog has 31. |
| Junk pickups | 11 | Audit game pickup actors, biome conditions and version changes. |
| Ordinary fishing locations | 28 | Independent PalDB positions already exist. |
| Rare fishing locations | 2 | Independent PalDB positions already exist; also restore rare/common classification for retained ponds. |
| Generic NPC positions | 16 | Ten have independent PalDB candidates; inspect spawner definitions for the remainder. |
| Black Marketeer positions | 11 | Independent PalDB candidates exist. |
| Pal Merchant positions | 10 | Six have independent candidates; inspect NPC spawn variants and conditions for the remaining four. |
| Wandering Merchant positions | 8 | Independent PalDB candidates exist. |
| Oil-rig NPC position | 1 | Inspect actor/spawner and raid-stage conditions. |
| Enemy camp position | 1 | Independent candidate exists; check duplicate/version differences. |
| Lifmunk effigy position | 1 | Independent PalDB candidate exists; reconcile actor identity with the 407-entry effigy source before adding a duplicate. |

Total: 347 candidate location discrepancies, including 53 cluster coordinate discrepancies that may be centroid/spawner differences. This is the complete comparison backlog against the previous deployment, not a complete inventory of every game actor.

## Classification and information omissions

- 122 Region point markers were removed. Region hover geometry uses 81 polygons, which is a different representation. Audit every old region name against extracted area triggers/text tables before treating hover coverage as equivalent.
- 102 retained main-world rare fishing locations and 22 World Tree rare locations are shown as generic Fishing Spot. Restore the rare classification from independently identified source records.
- Merchant/quest/critic subtype filters were collapsed to NPC. Four Black Marketeer, four Medal Merchant, nine Arrogant Pal Critic and 12 Quest NPC positions match existing generic NPC records; their subtype filtering still needs restoration.
- The two previous Oilrig Prize points that failed a prize-category match are present as Oil Rig Containers in the independent source. They are not missing treasure pins. Current treasure coverage is 1,412 main ordinary chests, 109 elemental chests, 38 tree chests, 47 containers, nine possible prize locations and 42 treasure-map locations.
- Chest appearance odds, fixed grade/tier, respawn times, guaranteed coin ranges and roll counts are not established by current location records. Generic loot previews exist; elemental chests and oil-rig prize pins still need their exact loot-pool links. No percentages should be substituted between table-roll chance and world-spawn probability.
- Wild-Pal habitat sample points were excluded from the location catalog. Separate day/night habitat overlays and actual spawn-group data are still needed.
- The compact map schema discards source Z/height, region identifiers, some spawn conditions/reward metadata and original localized descriptions. Audit these fields, dungeon respawn/entry conditions, fishing pool links, egg size/species pools and NPC schedule/shop links against originals.
- Upstream raw game versions differ and some endpoints are unversioned. No complete-game coverage claim is verified.

## Extracting missing data

Use a single verified game build and retain its version/hash. Export persistent levels AND every world-partition cell for both worlds and relevant caves/dungeon interiors. Resolve actor component parent transforms to world X/Y/Z; deduplicate by actor identity rather than rounded positions.

Arkive's independent extractor is a practical reference: https://github.com/arkive-games/arkive/blob/master/tools/apps/palworld/maps/extract.py . It reads persistent levels and world-partition actors. Known classes include BP_PalMapObjectSpawner_Treasure_*_C, BP_OilrigTreasureBoxSpawner_C, BP_OilrigTreasureBoxSpawner_Goal_C, BP_LevelObject_TreasureMapPoint_C, resource spawners and NPC spawners. These class names are actual game nomenclature.

Resolve each actor's class defaults plus instance overrides. Follow FieldLotteryName into DT_ItemLotteryDataTable, fishing SpotLotteryName into DT_PalFishingSpotLotteryDataTable, and region triggers into DT_WorldMapAreaData and localized world-map text. Derive loot odds from lottery weights and roll count; derive spawn chance and respawn from spawner logic separately. Unknown cave/awakening class names must be discovered from exports rather than invented. Validate representative locations in game and compare old IDs only for saved-progress migration.

Completion criteria: every discrepancy has a documented resolution, all supported actor classes have coverage counts per map/region, all pins have source actor IDs and build provenance, category distinctions are retained, and uncertain locations remain explicitly unresolved rather than silently discarded. This turn does not modify or publish live map data.
