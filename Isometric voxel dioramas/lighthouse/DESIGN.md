# Lighthouse Harbor — Design Sheet

## Premise

On a small island, a keeper maintains a rotating beacon and secures the skiff at
the pier when a gust hits. The lighthouse, red sail, timber pier, rock breakwater,
and square sea slab follow the supplied reference image. The keeper returns to
the lighthouse door before the cycle closes.

## Commission

| Choice | Value |
| --- | --- |
| Slab | 10 × 10 gallery tile with a 0.45 m cut edge |
| Camera | Orthographic three-quarter view; default azimuth 45°, elevation 33° |
| Loop | 46 seconds; every motion derives from absolute `t` |
| Palette | Warm stone, ivory and signal red; teal water; timber browns |
| Systems | Rotating beacon; undulating sea and wake; dock line and cleats; pier lantern and harbor marker |
| Roles | Keeper; sailor; two gulls |
| Disruption | Short coastal gust that flexes the pennant, rocks the skiff, and raises the wake |
| Payoff | Keeper pulls the mooring line taut, signals the sailor, and returns to the door |

The existing gallery uses a square 10 m tile. That scale keeps the reference
composition and its beach, lighthouse, pier, and boat legible in the same frame
as the other gallery scenes.

## Five beats

| Beat | Time | Staging |
| --- | --- | --- |
| Quiet watch | 0–7 s | Keeper starts at the door; beacon turns; skiff bobs at the pier |
| Pier check | 7–16 s | Keeper walks to the cleat and checks the slack line |
| Gust | 16–23 s | Pennant leans; skiff rolls; wave texture and stern wake lift |
| Secure | 23–33 s | Keeper reaches for the line and pulls it taut; sailor answers with a wave |
| Return and seam | 33–46 s | Keeper walks back; sea, gulls, lantern, and beam resolve to the starting pose |

## Detail targets

- **Landmark:** lighthouse foundation, tapered shaft, four red bands, door and
  lintel, slit windows, balcony deck and rails, braces, lantern glazing, Fresnel
  rings, roof, cap, and pennant.
- **Hero prop:** skiff hull, keel, gunwales, deck, seats, mast, red sail, rigging,
  pennant, and mooring line.
- **Supporting props:** individually planked pier, cross-beams and piles, cleats,
  rope coil, rescue ring, pier lantern, harbor marker, beach path, shore stones,
  and beach grass.
- **Ambient loops:** water and wake; lighthouse beam; two independently phased
  gulls; pennant and pier lantern.

## Frame checks

Review the loop at 0, 9, 18, 28, and 40 seconds. Check the lighthouse silhouette,
boat contact at the waterline, keeper feet on shore/pier, rope endpoints, beam
margin, and the seam between 45.9 and 0 seconds. The geometry sampler and
JavaScript parser checks are recorded in `qa/report.json`. A browser screenshot
could not be captured in this session because the app refused the local `file://`
page URL.
