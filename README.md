# Hyperlight

Infrastructure for agents and humans, any scale, any place.

The Hyperlight project site and blog, built with Next.js, TypeScript, Tailwind CSS, Radix UI, and Markdown. The design keeps the page quiet and uses a little prismatic color where it counts.

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
```

This creates a draft in `content/posts/`. Existing posts are never overwritten; repeated titles get a numbered filename. Open the new file and replace its placeholder description and body. Set `draft: false` when it is ready.

Posts are ordinary `.md` files with YAML frontmatter:

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

The filename becomes the URL slug: `a-better-way-to-build.md` appears at `/blog/a-better-way-to-build`. Use lowercase words separated by hyphens. Frontmatter does not need a `slug` field; if present, it must match the filename.

Drafts and future-dated posts are excluded from listings and public article routes. Dates use UTC. The site reads posts when it builds, so publish a new build when a scheduled date arrives. Invalid metadata fails with the offending filename, including in drafts.

Markdown supports GitHub-style tables, task lists, strikethrough, footnotes, and syntax highlighting. Give fenced code blocks a language, such as `typescript` or `rust`. Section links such as `[Details](#the-details)` work, including repeated headings. Raw HTML is discarded, unsafe links are stripped, and posts do not execute JSX or JavaScript frontmatter.

## Update projects

Edit `lib/projects.ts` to change descriptions, repository links, and project details. Keep each slug stable so existing project URLs and associated posts continue to work. Project copy should describe what the tool does and where it is useful.

## Design and accessibility

The visual language is restrained: neutral surfaces, clear type, generous space, and small prismatic accents. Keep color intentional. Interactive elements should work with a keyboard, show a visible focus state, and have useful accessible names. Check mobile layouts as well as large screens.

Motion should clarify a transition or bring a quiet detail to life. Respect `prefers-reduced-motion`, avoid hiding essential content behind an animation, and give hover interactions an equivalent focus state.

The controls in `components/ui/` are locally owned Radix wrappers styled with Tailwind, following the shadcn approach. The hero is an original animated SVG; the rest of the illustrations use SVG and CSS. The hero and footer motion controls pause ambient animation throughout the site. A device's reduced-motion setting takes precedence.

The hero's back and next arrows cycle through fifteen light studies: Hyperlight plus one for each of the fourteen projects. Arrow keys also work when a control has focus. Project studies load on selection. Each shares visibility-aware motion controls and has a static reduced-motion state. The components live in `components/studies/`; the collection and labels live in `lib/studies.ts`, and `components/study-artwork.tsx` maps them to lazy-loaded components. The counter is derived from that collection.

Project detail pages and cards reuse the same studies as the landing gallery. Card previews load near the viewport and animate while the card is hovered or contains keyboard focus; they hold their current pose when the interaction ends. Their prismatic edge follows the same interaction. Global pause and reduced motion take precedence, and touch links still open with a single tap. `components/project-card-surface.tsx` owns this interaction without running the whole collection on a phone. All project marks come from `components/project-mark.tsx` across the landing page, catalog, and details. To add a project, update `lib/projects.ts`, add its metadata to `lib/studies.ts`, register its component in `components/study-artwork.tsx`, and draw its mark in `components/project-mark.tsx`. The project routes, filters, counts, navigation, and sitemap follow the data. Registry tests catch missing studies, duplicate IDs, and excluded repositories.

The September 2026 expansion is documented in `docs/project-inventory.md`. It includes the Hecate creation-date cutoff, the exclusion of every Sylk-related repository, Cocoa, and mkfst-py, and first-party sources for each project's purpose and stage. Keep compatibility and security claims framed as design intentions until the repositories establish implemented behavior.

The Slates mark is the repository's existing source-and-workspace tablet design. The Hyperlight mark is an original folded optical contour; a reusable SVG is in `public/brand/`. See `docs/brand-research.md` for the primary-source similarity review and its limits.

## Check the interface

```sh
npx playwright install chromium
npm run test:e2e
```

The browser suite covers mobile and desktop layouts, project and article searches, keyboard navigation, animation controls, reduced motion, button contrast, and automated accessibility checks. It reuses a local server when one is running. To use an installed Chrome instead, run `PLAYWRIGHT_CHROMIUM_CHANNEL=chrome npm run test:e2e`.

Run `npm run format` to format source and content. The production build uses Next.js's Webpack compiler; development uses Turbopack.

## Deploy

Deploy as a standard Next.js application. Set `NEXT_PUBLIC_SITE_URL` to the site's final HTTPS origin before building, for example `https://hyperlight.example`. Use an origin only, without a path, credentials, query, or fragment. The local default is `http://localhost:3000`; it is for development and should not be used for production metadata.

The canonical origin is validated in `lib/site.ts` and is used for absolute metadata URLs. Posts ship with the build; no database or CMS is required.
