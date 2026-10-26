# Research Log — Lighthouse Harbor

| Question | Searched / inspected | Finding | Decision |
| --- | --- | --- | --- |
| What composition should the scene match? | User-provided `reference.png` | Red-and-white tower on a rocky headland; lantern at the top; timber pier; red-sailed skiff; sandy foreground beach; blue water; square cutout slab | Matched the tower/pier/boat diagonal and warm shore palette; added keeper activity and harbor props without changing the composition |
| How does a lighthouse light move? | [Oak Island Lighthouse: rotating LED update](https://www.oakislandlighthouse.org/1204/); [rotating Split Rock Fresnel lens video](https://commons.wikimedia.org/wiki/File:Fresnel_lenses_rotating_at_Split_Rock_Lighthouse.webm) | The lighthouse signal is produced by a rotating optical assembly; Oak Island documents a four-flash characteristic followed by a dark interval | Rotating amber beam and Fresnel detail; the 9.2 s turn is a stylized loop timing, not a claim about a particular lighthouse's signal |
| What does securing a small boat involve? | [Solo sailboat mooring video](https://sailing.directory/en-GB/videos/24LpLM-VcgU); [City of Avalon mooring guide](https://www.cityofavalon.gov/180/Mooring-How-to-Pick-Up-Tie-Off) | A line is prepared, led to a cleat or buoy, then tensioned to hold the boat; crew movement is deliberate at the dock | Keeper checks the slack line, reaches to the cleat, pulls it taut, signals the sailor, then returns to the tower |
| Can a sourced model match the hero silhouette? | Local project scan for `.glb`, `.gltf`, `.obj`, and `.fbx`; web search for low-poly lighthouse and island models | No local model files found. Search results included CC-BY low-poly lighthouse/island models, but the available island model is tropical and does not match the supplied lighthouse, pier, beach, and sailboat arrangement | No geometry import. Built the scene from the gallery's existing mesh helpers to match the reference exactly; no asset licensing dependency |

## Motion grammar

Beacon: lens sweeps steadily around its vertical axis; the visible warm wedge
narrows before the slab edge. Skiff: hull bobs and rolls with the sea; it remains
inside the cutout. Keeper: walks to the cleat, reaches, braces during the gust,
pulls the mooring line, waves, and returns to the door. All positions are
functions of `t`; no integration or random values are used.

The reference photo and third-party pages are research only. No third-party media
or meshes are bundled.
