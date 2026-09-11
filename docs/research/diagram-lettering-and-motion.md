# Diagram lettering and meaningful motion

Researched 2026-09-11 for the native SVG diagrams in the Proof Work and Vorpal articles. Sources are first-party design guidance and NASA/JPL illustrations. The two NASA/JPL images below were downloaded temporarily and visually inspected; the design-system examples were inspected through their published guidance. This is design research, not a usability study or a claim that the proposed visual treatment has been validated.

## What the primary sources support

### A technical diagram establishes exactly what each label belongs to

NASA's [Pioneer spacecraft diagram](https://science.nasa.gov/resource/pioneer-spacecraft-diagram/) uses a three-dimensional spacecraft drawing, grouped labels in surrounding empty space, and fine elbow leaders terminating at individual instruments. Its typography is large, condensed, and yellow, rather than understated monospace. The useful visual observation is precise ownership and clearance between letters and structural detail; the image does not establish a universal “technical font.” [Inspected image](https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/7/72410main_ACD97-0036-2-1.jpg?crop=faces%2Cfocalpoint&fit=clip&h=2254&w=3000).

JPL's [James Webb Space Telescope diagram](https://www.jpl.nasa.gov/infographics/james-webb-space-telescope/) separates compact component names from smaller explanatory text. Leaders attach the names to specific parts, while a bracket distinguishes a larger assembly. The illustration and labels have different jobs, and the hierarchy remains visible without a separate framed card around every component. These are observations from the published image, not NASA typography requirements. [Inspected image](https://d2pn8kiwq2w21t.cloudfront.net/original_images/infographicsuploadsinfographicsfull11186.jpg).

### Typography is a system of roles, not a single font swap

[Carbon typography](https://carbondesignsystem.com/elements/typography/overview/) uses coordinated type styles to express hierarchy. Its productive treatment is compact and task-oriented; expressive styles give editorial material more prominence. Carbon also prioritizes legibility in text color, generally uses neutral text, and identifies warnings and code as reasons to introduce color. Its visual examples contrast neutral text with arbitrary decorative color.

Vercel says [Geist Mono](https://vercel.com/font?type=mono) originated as a readable monospace for coding environments. Its [typography specimens](https://vercel.com/geist/typography) distinguish single-line labels from multiline copy, provide mono label sizes of 12–14px, and use tabular figures for stable numeric spacing. This supports a compact technical labeling vocabulary using the site's existing font. It does not establish that 9px text after SVG scaling is readable, or that uppercase is appropriate for every label.

### Movement should explain causality and preserve ownership

[Carbon motion](https://carbondesignsystem.com/elements/motion/overview/) favors restrained motion for task-focused work and reserves expressive movement for significant moments. It discourages bounce, stretch, abrupt stopping, and decoration without purpose. Its productive standard curve is `cubic-bezier(0.2, 0, 0.38, 0.9)`; example duration tokens include 150ms for small movements and 240ms for expansion or communication. Larger movements warrant longer timing. These are interface examples, not mandatory timing for a narrated process.

[Carbon choreography](https://carbondesignsystem.com/elements/motion/choreography/) gives concrete examples of sorting, expanding table rows, opening dropdowns, and staggered content. The underlying principles are consistent motion for consistent meanings, stable shared elements, spatial relationships that survive a transition, and a sequence that ends on the important result. Its rule against diagonal paths belongs to Carbon's grid UI; it is not a prohibition on curved connections inside a projected SVG diagram.

Google's original [Material choreography guidance](https://m1.material.io/motion/choreography.html) is particularly relevant to attached lettering: shared elements maintain the focal point, changing content is anchored to the motion of its surface, and unrelated items should not cross paths or compete for attention. Its expanding-card examples preserve an identifiable shared element across the transition. This is historical first-party guidance used for that continuity principle, not a proposal to adopt Material card styling.

The [W3C explanation of animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) describes disabling nonessential interaction-triggered movement, including through the operating system's reduced-motion setting. Carbon additionally recommends a static way to communicate the same state. Existing pause and reduced-motion behavior should survive any redesign.

## Our design decisions for Hyperlight

The decisions below are a synthesis for this site, not prescriptions from NASA, IBM, Google, or Vercel.

1. **Give the lettering a physical owner.** Short object names and roles belong to a deliberate clear region of the front face: a narrow edge inscription, an inset datum line, or a small face marking. Generate the face, its baseline, and its letters from the same local coordinates and transform. Prefer a shallow, readable face orientation. Moving only a text anchor over independently rotating geometry still makes the text appear to float. Long explanations remain outside the sculpture, with an anchored leader when needed.

2. **Let the object carry the explanation.** Distinguish an agent, a ledger, a record, and a result through their construction and their changing geometry. Avoid repeating a large heading, role, divider, and paragraph inside every rectangular slab. Use a compact identity inscription, a smaller role, and sparse aligned values; let the surrounding article explain sentences. A record that becomes committed should visibly join the ledger, rather than merely changing a sentence inside a stationary box.

3. **Build a restrained hierarchy.** Keep Geist Mono at a regular weight for identifiers and values; use slightly tracked short names, plain case for status sentences and formulas, and tabular numerals. Tune size in rendered pixels as well as SVG units. Architectural faces may accept a subtle baseline angle, but letters should never become difficult to read to prove they are attached. Keep label regions clear of bright mesh crossings; use semantic status color only where it conveys actual state.

4. **Choreograph an event, then settle.** A useful default sequence is source change → transfer along an existing route → destination receipt → recorded outcome. Keep one record or marker identifiable throughout. Move a route light only when that transfer is being explained. At a refusal or missing prerequisite, stop the event at the boundary and show the actual state; do not complete a success-looking flow. Preserve each diagram's domain semantics—for example, posting or receiving a work order does not itself mean acceptance has been evaluated.

5. **Keep ambient motion subordinate.** Slow refraction can show material, but constant simultaneous breathing of every face and label competes with the event. Keep identity markings legible while an active record, boundary, or destination provides the dominant movement. Use a bounded transition and a readable settled pose. A source-to-destination sequence is illustrative timing, not a claim about measured system latency.

6. **Verify attachment and state, not just font properties.** Compare desktop and narrow screenshots at a stable pose and during a transition. Check label bounds against the owning face, label–mesh clearance, continuity of transferred objects, and the order in which labels and geometry change. In reduced motion, selection must immediately expose the correct final state. Font-family tests alone cannot establish visual integration.

## Implementation seams to inspect

- `components/proof-work/process-geometry.ts`: the shared object construction and label creation are the right seam for face-attached identity, role, and content regions.
- `components/proof-work/proof-scene.tsx`: apply the same face transform to labels and geometry; preserve semantic fill overrides and reduced-motion state updates.
- `components/proof-work/*-geometry.ts`: own the specific event and its outcome; do not introduce an unrelated universal success animation.
- `components/diagram-type.module.css`: retain shared text roles, but do not expect typography tokens to solve spatial ownership.

No application code was changed for this research note.
