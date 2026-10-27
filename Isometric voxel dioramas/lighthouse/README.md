# Lighthouse Harbor

Lighthouse Harbor is the default scene in the Voxel Worlds gallery. The gallery
plays a 9.2-second, constant 30 fps H.264 copy of the user-supplied MP4 as a
silent loop. The exact supplied file is preserved at
`../videos/lighthouse_source.mp4`; the playback copy is
`../videos/lighthouse.mp4`. The clip's poster is `../posters/lighthouse.jpg`.

## Files

- `refs/video_contact.jpg` and `refs/video_contact_2fps.jpg` are frame sheets
  sampled from the supplied clip.
- `refs/reference.png` is the still image supplied with the original request.
- `scene.js` retains the procedural 46-second geometry version as an alternate;
  set the catalog item's `video` to `null` in `../scenes.html` to use it.
- `DESIGN.md` records the active video scene and the procedural alternative.
- `refs/SOURCES.md` records the video observations and motion research.
- `CREDITS.md` lists the supplied media and the hand-built fallback.
- `qa/report.json` records active-video metadata and checks for both versions.

The gallery entry point is [`../scenes.html`](../scenes.html). No third-party
models, textures, or runtime libraries are required.
