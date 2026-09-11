# Hyperlight

Infrastructure for agents and humans, any scale, any place.

The Hyperlight project site and blog, built with Next.js, TypeScript, Tailwind CSS, Radix UI, Markdown, and MDX. The design keeps the page quiet and uses a little prismatic color where it counts.

## Run locally

Use Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). To check a change and run the production build:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Write a post

```sh
npm run post -- "A better way to build"
# For a post with embedded React components:
npm run post -- --mdx "How Vorpal works"
```

This creates a draft in `content/posts/`. Existing posts are never overwritten; repeated titles get a numbered filename. Open the new file and replace its placeholder description and body. Set `draft: false` when it is ready.

Posts are `.md` or `.mdx` files with the same YAML frontmatter:

```markdown
---
title: "A better way to build"
description: "A sentence about the idea behind this post."
date: "2026-09-10"
category: "Engineering"
project: "vorpal"
featured: false
draft: false
---

Start with the idea.

## The details

Write Markdown here, including links, lists, tables, and fenced code blocks.
```

`title`, `description`, `date`, and `category` are required. The date must be a real calendar date in `YYYY-MM-DD` format. `project` is optional and connects the post to a project slug from `lib/projects.ts`. `featured` and `draft` are optional booleans that default to `false`.

Posts appear newest first. Optional `order` is a safe integer that controls ordering within the same date: lower values appear first, and omitted values default to `0`. For example, `order: 1` places an announcement below other posts from that day without changing its publication date. Remaining ties use the URL slug alphabetically.

The filename becomes the URL slug: `a-better-way-to-build.md` or `a-better-way-to-build.mdx` appears at `/blog/a-better-way-to-build`. Use lowercase words separated by hyphens. Frontmatter does not need a `slug` field; if present, it must match the filename. Keep only one file per slug: duplicate `.md`/`.mdx` names fail validation, including drafts. Renaming an existing post from `.md` to `.mdx` does not change its URL.

Drafts and future-dated posts are excluded from listings and public article routes. Dates use UTC. The site reads posts when it builds, so publish a new build when a scheduled date arrives. Invalid metadata fails with the offending filename, including in drafts.

Both formats support GitHub-style tables, task lists, strikethrough, footnotes, and syntax highlighting. Give fenced code blocks a language, such as `typescript` or `rust`. Use Markdown headings for the table of contents. Section links such as `[Details](#the-details)` work, including repeated headings. Frontmatter is always YAML; JavaScript frontmatter is rejected.

Tables fill the article column. Wide tables scroll inside a keyboard-accessible wrapper, without widening the page.

### Embed a React component

In an `.mdx` post, use a registered component directly between paragraphs:

```mdx
## How indexing works

Vorpal parses source files and resolves links across the repository.

<VorpalArchitecture description="Files become a graph and search indexes, queried through the CLI or MCP." />

The graph is updated when files change.
```

The registry is `components/article-components.tsx`. To add a reusable figure, create its React component, import it there, and add its name to `articleComponents`. No import is needed in the article; post-level imports and exports are rejected. Interactive components can use `"use client"` and the site's motion hooks. Their props must be serializable. Articles themselves compile and render on the server, without shipping the MDX compiler to readers.

The Vorpal article also uses `<VorpalEmbeddings />` for the three embedding methods, `<VorpalRanking />` for the worked rank-fusion example, `<VorpalBenchmarks />` for cold indexing, and `<VorpalComparisons kind="agents" />` or `kind="retrieval"` for measured comparisons. `<VorpalTgrep />` compares cold build time, peak indexing memory, and disk usage against tgrep with a fixed scale for each metric across all three repositories. `<VorpalFootprint />` compares peak resident memory and warmed index storage with equal-area cells. Each cell represents 25 MB, including partial cells; the fixed 4 GB RAM and 10 GB disk chart limits do not represent the benchmark machine's capacity. Comparison figures retain their full data tables. Article selectors share `components/article-tabs.module.css`; reuse it instead of introducing another control style. Animated figures use `useStudyMotion` to stop offscreen and obey the site's pause and reduced-motion settings.

MDX uses JSX syntax: close tags, use `className` rather than `class`, and put literal braces or angle brackets in code spans/fences (or escape them). Unlike ordinary Markdown, MDX expressions execute JavaScript. Treat `.mdx` changes as code changes from trusted repository authors, including in preview builds. The component registry and import policy are not a sandbox: never feed remote content, uploads, or user submissions to this loader.

Ordinary `.md` posts keep their sanitized Markdown renderer: raw HTML is discarded, unsafe links are stripped, and JSX is not executed. Existing registered Markdown figure images remain supported for compatibility, but use explicit React components in new MDX posts.

## Update projects

Edit `lib/projects.ts` to change descriptions, repository links, and project details. Keep each slug stable so existing project URLs and associated posts continue to work. Project copy should describe what the tool does and where it is useful.

## Design and accessibility

The visual language is restrained: neutral surfaces, clear type, generous space, and small prismatic accents. Keep color intentional. Interactive elements should work with a keyboard, show a visible focus state, and have useful accessible names. Check mobile layouts as well as large screens.

Motion should clarify a transition or bring a quiet detail to life. Respect `prefers-reduced-motion`, avoid hiding essential content behind an animation, and give hover interactions an equivalent focus state.

The controls in `components/ui/` are locally owned Radix wrappers styled with Tailwind, following the shadcn approach. The hero is an original animated SVG; the rest of the illustrations use SVG and CSS. The hero and footer motion controls pause ambient animation throughout the site. A device's reduced-motion setting takes precedence.

The hero's back and next arrows cycle through seventeen light studies: Hyperlight plus one for each of the sixteen projects, including Grid's cubic lattice and Ergo's radial distributor. Arrow keys also work when a control has focus. Project studies load on selection. Each shares visibility-aware motion controls and has a static reduced-motion state. The components live in `components/studies/`; the collection and labels live in `lib/studies.ts`, and `components/study-artwork.tsx` maps them to lazy-loaded components. The counter is derived from that collection.

Project detail pages and cards reuse the same studies as the landing gallery. Card previews load near the viewport. On desktop, they animate while hovered or containing keyboard focus; on touch devices and compact layouts, they animate as they scroll into view. Their prismatic edge follows the same activation. Cards pause offscreen or in a hidden tab, preserving their pose for the next visit. Global pause and reduced motion take precedence, and touch links still open with a single tap. `components/project-card-surface.tsx` owns this interaction without running the whole collection on a phone. All project marks come from `components/project-mark.tsx` across the landing page, catalog, and details. To add a project, update `lib/projects.ts`, add its metadata to `lib/studies.ts`, register its component in `components/study-artwork.tsx`, and draw its mark in `components/project-mark.tsx`. The project routes, filters, counts, navigation, and sitemap follow the data. Registry tests catch missing studies, duplicate IDs, and excluded repositories.

The September 2026 expansion is documented in `docs/project-inventory.md`. It includes the Hecate creation-date cutoff, the exclusion of every Sylk-related repository, Cocoa, and mkfst-py, and first-party sources for each project's purpose and stage. Keep compatibility and security claims framed as design intentions until the repositories establish implemented behavior.

The Slates mark is the repository's existing source-and-workspace tablet design. The Hyperlight mark is an original folded optical contour; a reusable SVG is in `public/brand/`. See `docs/brand-research.md` for the primary-source similarity review and its limits.

## Check the interface

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite covers mobile and desktop layouts, project and article searches, keyboard navigation, animation controls, reduced motion, button contrast, and automated accessibility checks. It reuses a local server when one is running. To use an installed Chrome instead, run `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e`.

The card controller reconciles native hover and focus after hydration and viewport/tab restoration, so interactions that precede JavaScript are not lost. The motion regression suite covers that timing, sustained playback, scroll entry/exit, touch activation, and pause/reduced-motion overrides across Chromium, Firefox, and WebKit (including touch WebKit):

```sh
npx playwright install chromium firefox webkit
npm run test:e2e:motion
```

Run `npm run format` to format source and content. The production build uses Next.js's Webpack compiler; development uses Turbopack.

## Deploy

Deploy as a standard Next.js application. Set `NEXT_PUBLIC_SITE_URL` to the site's final HTTPS origin before building, for example `https://hyperlight.example`. Use an origin only, without a path, credentials, query, or fragment. The local default is `http://localhost:3000`; it is for development and should not be used for production metadata.

The canonical origin is validated in `lib/site.ts` and is used for absolute metadata URLs. Posts ship with the build; no database or CMS is required.
