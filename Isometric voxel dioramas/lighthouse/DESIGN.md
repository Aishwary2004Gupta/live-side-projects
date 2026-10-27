# Lighthouse Harbor — Design Sheet

## Active gallery scene

The active Lighthouse Harbor entry uses a 9.2-second, constant 30 fps playback
copy made from the supplied 9.215-second MP4. It keeps
the reference image's three-quarter cutout composition: a red-and-white tower on
a rock headland, a sandy shore, a timber pier, a red-sailed skiff, and open blue
water. The camera remains fixed in the clip against a white background.

| Choice | Value |
| --- | --- |
| Slab | Square 10 m diorama, brown cut edge |
| Camera | Fixed three-quarter view, white page |
| Loop | 9.2-second, 30 fps playback copy; gallery video loops silently |
| Palette | Ivory and signal red; warm stone and sand; teal and blue water |
| Motion | Beacon alternates between bright and dark; boat rocks at the pier; ripples expand; gulls pass |
| Cast | No people; skiff and gulls provide the motion |

## Clip beats observed

| Approx. time | What is visible |
| --- | --- |
| 0–2 s | The lantern dims, then brightens; water and boat move subtly |
| 2–5 s | Beacon cycles again; gulls cross the sky; rings spread beside the skiff |
| 5–9.2 s | The same fixed composition continues with alternating beacon light, gentle boat motion, and ripples |

The clip was sampled at 1 fps and 2 fps. Contact sheets are in `refs/`.

## Procedural alternative

`scene.js` retains the earlier hand-built WebGL version for use when the catalog
entry's `video` value is set to `null`. It stages a 46-second keeper-and-mooring
story with a gust, moving water, and a rotating beam. The gallery currently plays
the supplied video, so the procedural version is not part of the active loop.
Its syntax, finite geometry, tile bounds, and t=0/t=46 seam are checked by
`qa/probe.mjs` and reported in `qa/report.json`.

## Research reference

The supplied MP4 is the visual and motion acceptance reference. Check framing,
red/white banding, shore-to-pier layout, boat placement, lamp rhythm, wake rings,
and gull timing against `refs/video_contact_2fps.jpg`. The exact supplied file is
preserved at `../videos/lighthouse_source.mp4`; the normalized playback copy is
`../videos/lighthouse.mp4`; the gallery poster is `../posters/lighthouse.jpg`.
