# Research Log — Lighthouse Harbor

| Question | Searched / inspected | Finding | Decision |
| --- | --- | --- | --- |
| What should the gallery scene show? | User-provided `refs/reference.png` | Red-and-white lighthouse, rock headland, pier, red-sailed skiff, beach, and blue water on a square tile | Matched the supplied composition |
| How does the requested scene move? | User-provided `C:\Users\asus\Downloads\wLXgzsbioiCv9znZ.mp4`; sampled at 1 fps and 2 fps into `video_contact.jpg` and `video_contact_2fps.jpg` | The camera stays fixed. The lantern alternates bright/dark; the boat rocks slightly beside the pier; wake rings expand; gulls cross the frame. No keeper is visible. | Use the MP4 itself as the active silent gallery loop. Do not add actors or motion absent from the reference clip. |
| What is the clip format? | `ffprobe` on the supplied MP4 | H.264, 1320 × 742, 9.215 seconds, 579,981 bytes | Copied unchanged to `../videos/lighthouse.mp4`; extracted a 640 px poster at `../posters/lighthouse.jpg` |
| How does a Fresnel light rotate? | [Oak Island Lighthouse: rotating LED update](https://www.oakislandlighthouse.org/1204/); [rotating Split Rock Fresnel lens video](https://commons.wikimedia.org/wiki/File:Fresnel_lenses_rotating_at_Split_Rock_Lighthouse.webm) | Real beacon systems use rotating optical assemblies and can use a characteristic flash pattern | Background reference only; the supplied clip controls the active lamp rhythm |
| What does tying up a sailboat involve? | [City of Avalon mooring guide](https://www.cityofavalon.gov/180/Mooring-How-to-Pick-Up-Tie-Off) | Mooring lines are prepared and secured to hold a boat | Not added to the active clip because no keeper or line handling appears in it |
| Can a sourced model match the hero silhouette? | Local project scan for `.glb`, `.gltf`, `.obj`, and `.fbx`; web search for low-poly lighthouse/island models | No local model files found. The search results included CC-BY models, but the available island scene was tropical and did not match the clip | No third-party geometry imported. The hand-built `scene.js` remains an optional procedural alternative |

## Active clip motion grammar

Fixed camera and composition. The lantern pulses between bright and dark states.
The skiff stays beside the pier, moving gently with the water; concentric rings
form and expand near the hull. Small gull silhouettes pass through the open sky.
The gallery loops the supplied clip silently.

The user-provided MP4 and still are the active references. Third-party sources are
background research only; no third-party media or meshes are bundled.
