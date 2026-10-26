# Lighthouse Harbor

An animated isometric coastal diorama added to the existing Voxel Worlds gallery.
The gallery opens on Lighthouse Harbor by default; select its card again to reset
the 46-second loop. Drag to inspect the model and use the wheel to zoom.

## Files

- `scene.js` builds the lighthouse, rocky shore, beach, pier, skiff, keeper, and
  gulls with the gallery's existing WebGL geometry helpers.
- `DESIGN.md` records the staging, beats, cast, and detail targets.
- `refs/SOURCES.md` records the visual and motion research.
- `refs/reference.png` is the image supplied with the request.
- `CREDITS.md` lists assets and attribution.
- `qa/report.json` records code and geometry checks, including the live-preview
  limitation.

The entry point is [`../scenes.html`](../scenes.html). The implementation uses
the gallery's self-contained WebGL renderer and does not download any models or
runtime libraries.
