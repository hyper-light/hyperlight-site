# Hyperlight mark: visual similarity check

Reviewed September 10, 2026.

The initial three-bar mark does not exactly match any of the official marks inspected below. I would still change it: its recognition depends heavily on a familiar arrangement of vertical strokes, and the small colored middle stroke is doing much of the distinguishing work. That is a design judgment from this comparison, not evidence that the mark was copied.

This is a focused visual review using primary sources, not trademark clearance. It cannot establish that no similar logo exists anywhere.

## The mark reviewed

This review concerns the initial implementation in [components/brand.tsx](../components/brand.tsx) and the `.brand-mark` rules in [app/globals.css](../app/globals.css), before any resulting redesign:

- Three separate vertical rectangles, each 4 CSS pixels wide, with 3-pixel gaps.
- Two 20-pixel outer strokes and an 11-pixel central stroke, vertically centered.
- The whole arrangement sheared with `skewY(-19deg)`.
- White outer strokes, a restrained prismatic center, and a lowercase `hyperlight` wordmark.

The component uses CSS primitives rather than an imported logo asset. Its silhouette suggests an abstract H or a small arrangement of signal bars. A CSS implementation alone does not demonstrate visual originality.

## Official marks inspected

The visual descriptions below come from inspecting the publishers' own image or SVG assets. The comparison column records my judgment; it does not report measured consumer confusion or legal similarity.

| Brand                             | Primary source and observed geometry                                                                                                                                                                                                                                              | Comparison with the initial Hyperlight mark                                                                                                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ElevenLabs                        | The [official brand guidelines](https://elevenlabs.io/brand) describe a symbol formed by two vertical lines. Its [published symbol image](https://eleven-public-cdn.elevenlabs.io/payloadcms/elevenlabs-official-logo-11-icon.webp) shows two equal, upright black rectangles.    | Both rely on isolated vertical bars. Hyperlight adds a short center stroke and a shear, so this is not an exact match. The similarity becomes more noticeable when the center detail is lost at small sizes.                                                        |
| Hypar                             | The [official site's favicon](https://hypar.io/hypar-favicon.svg) is an H assembled from four parallel vertical lines on each side and four horizontal crossbars, in coral pink. The SVG path coordinates confirm this construction. [Official site](https://hypar.io/).          | A closer conceptual neighbor: both abstract H with repeated straight strokes. Hypar has horizontal connectors and much denser striping; Hyperlight has three disconnected sheared bars. The individual geometry differs, but striped H is already used in software. |
| HashiCorp                         | The [official brand page](https://www.hashicorp.com/en/brand/hcp-brand-logos) identifies an isometric H in a hexagonal form. Its [official SVG sample](https://www.datocms-assets.com/2885/1772823413-black_logo.svg) shows the central H enclosed by additional angular strokes. | Both read as technical H marks, but HashiCorp's hexagonal enclosure and connected center distinguish its silhouette. Avoid evolving the new mark toward an isometric H inside a hexagon.                                                                            |
| Huly                              | The [official site](https://huly.io/) publishes a [512-pixel favicon](https://huly.io/favicon/favicon-512x512.png) with a thick diagonal central form, rounded corners, and separated blocks at opposite corners.                                                                 | No close match to three slender bars. It is another example of an abstract H-like software symbol, which argues for a more specific optical idea rather than another generic letter construction.                                                                   |
| Hyperlight, the VM project        | The [project's official site](https://hyperlight.org/) displays [stacked shield artwork](https://hyperlight.org/_astro/hyperlight-logo.BM2-muhG_Z1P26yK.webp): blue shields, an orange lightning bolt, and a feather.                                                             | The mark is visibly different. The exact shared name and related infrastructure subject matter deserve separate attention; changing the logo does not remove that name overlap.                                                                                     |
| HyperLight, the photonics company | The [official home page](https://hyperlightcorp.com/home) serves a [header logo](https://hyperlightcorp.com/img/logo.webp) containing an outlined square, an HL monogram, a small red top accent, and an uppercase wordmark.                                                      | No exact match. The rectangular monogram differs from the three-bar H, but the name is the same apart from capitalization. Light and optical imagery are also already part of this company's real subject matter.                                                   |

## Existing use of the Hyperlight name

Microsoft announced **Hyperlight** on November 7, 2024 as an open-source Rust library for running functions with hypervisor-based protection. The current [Hyperlight repository](https://github.com/hyperlight-dev/hyperlight) describes an embeddable virtual machine manager and identifies the project as a CNCF sandbox project. These are direct, existing uses of the same name in software infrastructure. [Microsoft's announcement](https://opensource.microsoft.com/blog/2024/11/07/introducing-hyperlight-virtual-machine-based-security-for-functions-at-scale/).

**HyperLight** also operates a photonics business under that name. Its own site presents thin-film lithium niobate chiplets and optical components for computing, cloud, data centers, and telecommunications. [HyperLight's official site](https://hyperlightcorp.com/home).

These findings do not propose renaming this user's brand. They do mean we should describe the outcome accurately: a new visual identity for this Hyperlight, with existing same-name uses documented, rather than a claim that the name is unused.

## Design recommendation

Replace the initial bars with a custom optical contour: for example, an asymmetric refraction loop or an open aperture with a displaced facet and a deliberate negative-space cut. Give it a recognizable silhouette before adding color. A plain infinity symbol, stock camera aperture, shield, or hexagonal H would discard much of that opportunity for distinction.

The useful connection to the landing page is the behavior of light at an edge: a mostly neutral form, one small point of spectral separation, and clear geometry. Test the resulting mark in a single color at 16, 24, and 32 pixels, then apply the prismatic accent. The mark should remain identifiable when that accent is absent.

This is a direction for a new drawing, not a claim that every possible aperture or loop is unique. The final geometry should be compared again with these official marks. No third-party logo asset should be incorporated into the site's mark.

## Implemented direction

The site now uses a custom asymmetric optical contour with an offset interior seam and a small prismatic edge, replacing the three bars. Its curved, open silhouette differs from the inspected striped H, paired bars, enclosed H, and shield marks. The drawing is defined in `lib/brand.ts`, with a standalone asset at `public/brand/hyperlight-mark.svg`. This is a new drawing for this site, not an imported third-party asset; universal uniqueness is still unverified.

Slates uses its repository's current native SVG, copied from `../slates/docs/assets/brand/slates-tablets-dark.svg`. The repository's brand notes explicitly record that an earlier three-plane stack was replaced after its resemblance to Redis was raised. The approved mark is a source tablet and an offset working tablet with a stepped opening. The site's initial generic stack was removed to preserve that existing decision.

## Scope and limits

The comparison covered the initial site's source geometry, six directly inspected official brand assets, targeted web searches, the current Hyperlight project site and repository, Microsoft's announcement, and HyperLight's corporate site. Search results and third-party logo collections were not treated as proof of a publisher's current identity. The assets were downloaded only for inspection; no third-party mark was added to the application.

The defensible conclusion is: **no exact duplicate was found among the marks reviewed; the initial bar motif has recognizable visual neighbors; a more specific silhouette would improve separation.** Universal uniqueness remains unverified.
