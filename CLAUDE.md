# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # astro dev — local server at http://localhost:4321
npm run build     # astro build — outputs to dist/
npm run preview   # serve the production build locally
npm run check     # astro check — type-checks .astro files and the project
```

There is no test suite and no linter configured. There is no git repository initialized in this directory.

## Architecture

This is a single-page Astro portfolio site (no client-side framework — Tailwind v4 for styling, one vanilla-TS script for interactivity).

**Data-driven content.** The page is assembled from two data sources, not hardcoded markup:
- [src/data/profile.ts](src/data/profile.ts) — name, bio, capabilities, contact links, location/timezone. Consumed by [Intro.astro](src/components/Intro.astro) and [Links.astro](src/components/Links.astro).
- [src/data/projects.json](src/data/projects.json) — project entries, loaded as an Astro content collection via `file()` loader and validated against the Zod schema in [src/content.config.ts](src/content.config.ts). Consumed by [ProjectList.astro](src/components/ProjectList.astro) (filters `featured`, sorts by `order`) and rendered per-item by [ProjectCard.astro](src/components/ProjectCard.astro).

All current values in `profile.ts` and `projects.json` are explicitly marked as placeholders — swapping them is expected to be safe without touching layout code.

**Page structure:** [index.astro](src/pages/index.astro) → [Base.astro](src/layouts/Base.astro) (head/meta/fonts/scripts) wraps `Intro` + `ProjectList`.

**Runtime JS is a single file**, [src/scripts/motion.ts](src/scripts/motion.ts), loaded directly (not a framework island) and doing exactly three jobs, documented in its header comment:
1. Scroll-reveal elements tagged `[data-reveal]` via `IntersectionObserver`, with a scroll-based sweep as a fallback for elements that never cross a frame boundary (e.g. restored scroll position).
2. Play/pause project-card videos on hover (pointer devices) or on-screen-centered (touch), via `canHover` media query branching.
3. Keep the footer's local clock ticking, aligned to the minute boundary rather than a naive `setInterval`.

Every animated property driven by this script is transform/opacity only, so the compositor handles frames without layout reads during scroll. `<noscript>` in `Base.astro` force-shows everything if JS is unavailable.

**Fonts are self-hosted**, not pulled from `@fontsource` at runtime: the woff2 files are copied out of `node_modules/@fontsource*` into `public/fonts/` and referenced by hand in [src/styles/global.css](src/styles/global.css) `@font-face` rules. After bumping the `@fontsource-variable/inter-tight` or `@fontsource/instrument-serif` versions, re-copy the woff2 files manually (see comment at top of `global.css`).

**Design tokens** (colors, fonts, easing curves) are centralized in the `@theme` block at the top of `global.css`, consumed via Tailwind's generated `--color-*`/`--font-*` utilities.
