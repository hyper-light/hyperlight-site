# World geography source notes

Researched 2026-09-11 for the offline SVG globe. Source facts below come from Natural Earth's own documentation and author-maintained repository, not an independent survey of geographic accuracy. The final section separately records our generation choices and checks.

## Verified source facts

Natural Earth publishes generalized map data at 1:10 million, 1:50 million, and 1:110 million scales; `50m` does not mean 50-meter accuracy. Its repository is maintained by Nathaniel Vaughn Kelso and Tom Patterson and describes the project as a volunteer collaboration supported by NACIS. The layers are designed to align with one another. [Author repository](https://github.com/nvkelso/natural-earth-vector).

| Layer                            | Dataset page and listed version                                                                                                | Author-repository data                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main 50m coastline               | [Coastline, 4.0.0](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-coastline/)                             | [ne_50m_coastline.geojson](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_coastline.geojson)                                     |
| 50m country land boundaries      | [Admin 0 boundary lines, 5.1.0](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-boundary-lines-2/) | [ne_50m_admin_0_boundary_lines_land.geojson](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_boundary_lines_land.geojson) |
| Optional small-island supplement | [10m minor-island coastline, 4.1.0](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-minor-islands/)        | [ne_10m_minor_islands_coastline.geojson](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_minor_islands_coastline.geojson)         |

The listed versions belong to individual datasets, not one common release. Repository `master` links identify the upstream files but are mutable; they are not a reproducibility pin.

### Coastline provenance and island limits

The 50m coastline is an automatically and manually generalized version of the 10m coastline. It includes major islands and the Caspian Sea, primarily derives from World Data Bank 2, and uses NASA Mosaic of Antarctica for Antarctica. Natural Earth documents remaining positional concerns in some regions, including northern Russia and southern Chile. It explicitly excludes minor-island coastline ranks 6, 7, and 8. [50m coastline documentation](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-coastline/).

Switching the main coastline to 10m alone does not solve the smallest-island omission: its documentation also excludes ranks 6–8. [10m coastline documentation](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/).

The separate 10m minor-islands layer covers islands described as 2 km² or smaller, derives from 1:250,000 World Vector Shoreline, and has limited polar coverage. These supplementary islands are not incorporated into the normal ocean/land or admin-0/admin-1 polygons. Consequently, the supplement needs explicit ingestion; country outlines alone cannot be assumed to recover it. [Minor islands documentation](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-minor-islands/).

### Political boundary meaning

Natural Earth's default is de facto control, not universal legal recognition. It marks disputed boundaries and provides additional claim lines in auxiliary downloads. Since version 5, `fclass_*` properties support alternative points of view. Its policy page was last updated in February 2022, so that policy is not evidence that a particular boundary reflects today's control. [Disputed-boundaries policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/).

The 50m boundary collection separates country land lines, map-unit lines, maritime indicators, and Pacific grouping lines. Those are different cartographic meanings, not interchangeable physical coastlines. [50m boundary collection](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-boundary-lines-2/). A separate 50m disputed-area collection publishes breakaway/disputed polygons and boundary lines; the page lists the latter as version 5.1.2. [Disputed-area collection](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-breakaway-disputed-areas/).

### License

Natural Earth states that all versions of its raster and vector map data are public domain. Modification, redistribution, and commercial use are permitted without permission or mandatory credit. It offers the optional credit “Made with Natural Earth.” The authors also disclaim responsibility for accuracy and use. Keeping source and transformation records remains useful even though attribution is not required. [Terms of use](https://www.naturalearthdata.com/about/terms-of-use/).

## Our implementation choices and verification

These are our cartographic/rendering decisions, not claims made by Natural Earth. The generated asset is `components/proof-work/world-geography.ts`; it has no runtime network access, GIS package, or simplification dependency.

### Pinned inputs

Ingested 2026-09-11 from upstream commit [`ca96624a56bd078437bca8184e78163e5039ad19`](https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19). These pins, rather than the mutable links above, identify the exact source files used:

- [50m coastline](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_coastline.geojson): SHA-256 `271f1c4c1908312bac6b29d158ea1356544beafc129f260005300913aa5ea283`.
- [50m country land boundaries](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_admin_0_boundary_lines_land.geojson): SHA-256 `2faac4f6b34386f3d21b6e018cf151f241f00e5c936d44dd17d7d9bfb147fa48`.
- [10m main coastline](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_coastline.geojson): SHA-256 `6f75ae0e0de157b14946e2255eb1f5486d9a13819032e26d4610852d296788f6`.
- [10m minor-island coastline](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_10m_minor_islands_coastline.geojson): SHA-256 `d51fadaffc954e9e85671b0a2ecaba78b883dda1714640a173c151932fd1f2fb`.

### Retention and simplification

All 1,428 source 50m coastline features (1,429 lines) and all 390 source 50m border features (393 lines) remain represented. Features were not ranked away to meet a DOM limit.

The source border classifications comprise 355 `International boundary (verify)`, 21 `Disputed (please verify)`, five `Indefinite (please verify)`, seven `Line of control (please verify)`, and two `Indeterminant frontier` features. The latter four classes remain separate from ordinary borders and set `disputed: true` on their render chunks. That flag means disputed **or uncertain/control-line** styling; it is not a fresh legal classification. No national `FCLASS_*` viewpoint was substituted for the source `FEATURECLA`.

The 50m source already represents the requested major island countries, but omits smaller neighboring outlines. We added 109 10m main-coastline lines and 71 separate minor-island lines in selected Pacific archipelagos, including Hawaiʻi. Candidate lines were restricted to these longitude/latitude boxes (`west, south, east, north`):

```text
[176, -11, 180, -5]      [170, -5, 180, 5]
[-175, -12, -150, 5]    [160, 4, 173, 15]
[130, 2, 135, 9]        [-176, -23, -173, -15]
[176, -21, 180, -15]    [-180, -21, -178, -15]
[137, 1, 164, 11]       [165, -21, 170, -13]
[-156.75, 20.45, -156.45, 20.65]
```

To avoid duplicate outlines, a supplementary line was skipped when its bounding-box center lay inside an existing closed 50m outline or within 0.03° of its edge. This is a conservative duplicate-screening heuristic, not a claim of complete global small-island coverage. All retained vertices originate from source geometry or interpolation along its segments; no invented island markers or enlarged land polygons were added.

Offline processing splits antimeridian crossings before simplification. Iterative Douglas–Peucker simplification uses a 0.30°-equivalent chord-distance threshold on the unit sphere, except the main Hawaiian group (`[-161, 18, -154, 23]`), which uses a finer 0.035° threshold. Closed small islands retain at least three distinct source vertices. Coordinates are rounded to three decimals, or five decimals for outlines smaller than 0.02° so tiny features do not collapse. Long simplified edges are subdivided to at most 18° in either coordinate; adjacent chunks share endpoints.

A specific Hawaiian audit found seven main-island outlines in the 50m baseline but no Kahoʻolawe. We added the missing outline from pinned 10m main-coastline feature 1673 (17 source vertices), using the last box above, and reduced simplification on the other Hawaiian islands so they no longer reduce to coarse triangles. The generated data now retains distinct closed contours for all eight main islands listed by the [U.S. Geological Survey](https://www.usgs.gov/media/audio/how-many-major-hawaiian-islands-are-there): Niʻihau, Kauaʻi, Oʻahu, Molokaʻi, Lānaʻi, Maui, Kahoʻolawe, and Hawaiʻi. This added only two render chunks and 40 retained vertices to the first generated asset.

After latitude-band/east-west sorting, nearby lines are greedily packed into the smallest fitting geographic bounding box, keeping each chunk within 20° longitude and latitude and at most 24 vertices. Disconnected lines remain separate arrays and require separate SVG `M` commands. They must never be flattened into a continuous island-to-island path. Chunk IDs are stable rendering IDs for this pinned asset, not country identifiers.

### Result and checks

| Output                                              |  Count |
| --------------------------------------------------- | -----: |
| Coastline chunks                                    |    412 |
| Country-border chunks                               |     87 |
| Total SVG-ready chunks                              |    499 |
| Retained vertices, including shared chunk endpoints | 10,692 |
| Additional 10m island outlines                      |    180 |

The slightly greater than 10k vertex count was accepted to retain islands. The simplification threshold corresponds to roughly 0.9 pixels at a 170-pixel globe radius; that is a rendering scale comparison, not an accuracy guarantee for the source geography.

`tests/world-geography.test.ts` verifies finite coordinate ranges, unique IDs, vertex/chunk budgets, local chunk extents, dateline-safe segments, surviving closed island outlines, and distinct coast/border classifications. Geographic bounding-box checks cover Great Britain, Ireland, both main New Zealand islands, Japan, Indonesia, the Philippines, Sri Lanka, the Caribbean, Tuvalu, the Marshall Islands, Palau, Tonga, Samoa, Nauru, and Fiji.

Additional tests reconstruct connected coastline components across chunk endpoints. Each of the eight main Hawaiian islands must have its own closed contour enclosing a separate inland fixture, with a minimum retained detail count. Japan's Hokkaido, Honshu, Shikoku, and Kyushu must likewise enclose four distinct inland fixtures. The American mainland coastline must enclose both North and South American inland fixtures in one connected component, with more than 600 retained vertices, and pass near representative California, Florida, Gulf, Central American, Peruvian, Chilean, Brazilian, and Argentine mainland-coast fixtures. These checks cannot be satisfied by a few unrelated island points inside a continent-wide box.

These checks establish retained regional detail, not exact sovereignty or complete coverage of every island. Seven pure data tests pass; desktop/mobile appearance is verified separately by the main implementation.
