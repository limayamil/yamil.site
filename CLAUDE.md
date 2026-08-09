# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # astro dev — local server at http://localhost:4321
npm run build     # astro build — outputs to dist/
npm run preview   # serve the production build locally
npm run check     # astro check — type-checks .astro files and the project
```

There is no test suite and no linter configured.

## Architecture

This is a single-page Astro portfolio site (no client-side framework — Tailwind v4 for styling, one vanilla-TS script for interactivity).

**Data-driven content.** The page is assembled from two data sources, not hardcoded markup:
- [src/data/profile.ts](src/data/profile.ts) — name, role, bio, capabilities, contact links, location/timezone. Typed against exported interfaces (`Profile`, `Capability`, `Localized`) rather than inferred from `as const`. Consumed by [Intro.astro](src/components/Intro.astro), [Axes.astro](src/components/Axes.astro) and [Links.astro](src/components/Links.astro).
- [src/data/projects.json](src/data/projects.json) — project entries, loaded as an Astro content collection via `file()` loader and validated against the Zod schema in [src/content.config.ts](src/content.config.ts). Consumed by [ProjectList.astro](src/components/ProjectList.astro) (filters `featured`, sorts by `order`) and rendered per-item by [ProjectCard.astro](src/components/ProjectCard.astro).

`profile.ts` now holds real content; `projects.json` is still placeholders. Swapping either is expected to be safe without touching layout code — subject to the copy budget below.

**Page structure:** [index.astro](src/pages/index.astro) → [Base.astro](src/layouts/Base.astro) (head/meta/fonts/scripts) wraps `Intro` + `ProjectList`.

**Bilingual (ES/EN) without routing.** Both languages are rendered into the single page and CSS shows one, keyed off `html[data-lang]`:
- Every visible string in `profile.ts` is a `{ es, en }` pair, rendered through [Bilingual.astro](src/components/Bilingual.astro).
- The switch is `display: none`, deliberately — it drops the inactive language out of the accessibility tree, so a screen reader reads the page once.
- Language is resolved by a small `is:inline` script in `Base.astro`'s head — the **only** JS outside `motion.ts`, and only because it must beat the first paint (`motion.ts` is deferred, so a stored preference would flash the wrong language). It reads `localStorage.lang`, falls back to `navigator.language`, and sets `data-lang`, `lang` and `document.title`.
- Spanish is what gets served, so Spanish is what crawlers index. The `<meta description>` is not swapped client-side.

**Bio glosses.** A term written as `[término](nota)` in a `profile.ts` bio becomes a hoverable footnote, parsed at build time by [src/lib/gloss.ts](src/lib/gloss.ts) into plain text nodes (never `set:html`). Keep marked terms to one word — `.gloss` is an inline-block button and will not break across lines — and one gloss per paragraph, since notes anchor to the paragraph.

**Runtime JS is a single file**, [src/scripts/motion.ts](src/scripts/motion.ts), loaded directly (not a framework island). Its header comment enumerates the jobs; keep that list in sync when adding one:
1. Scroll-reveal elements tagged `[data-reveal]` via `IntersectionObserver`, with a scroll-based sweep as a fallback for elements that never cross a frame boundary (e.g. restored scroll position).
2. Play/pause project-card videos on hover (pointer devices) or on-screen-centered (touch), via `canHover` media query branching.
3. Keep the footer's local clock ticking, aligned to the minute boundary rather than a naive `setInterval`.
4. Fetch the footer's live weather reading once, on load.
5. Drive the capability panel from whichever axis is hovered or focused.
6. Open a bio gloss on tap, where there is no hover to open it.
7. React to ES/EN toggle clicks (resolution happens in the head script, above).

State is always expressed as a `data-*` attribute or a class that CSS reacts to — never inline styles. Every animated property driven by this script is transform/opacity only, so the compositor handles frames without layout reads during scroll. `<noscript>` in `Base.astro` force-shows everything if JS is unavailable.

**The intro column has a hard height budget.** `.intro` is `position: sticky; height: 100svh` above 62rem, so anything added to it must fit one viewport. Two mechanisms hold that line, and both are measured numbers, not guesses:
- `.axis-panel` has a fixed `min-height` and stacks all its slots absolutely, so switching disciplines cannot move the column. Copy that outgrows the box is clipped. Budget: one sentence per `line`, four entries per `tools`.
- The `@media (min-width: 62rem) and (max-height: 61rem)` escape hatch releases sticky when the viewport is too short for the content. **Adding a row to the intro means re-measuring the column in both languages at the narrowest it gets (~19rem) and updating that number.**

**Fonts are self-hosted**, not pulled from `@fontsource` at runtime: the woff2 files are copied out of `node_modules/@fontsource*` into `public/fonts/` and referenced by hand in [src/styles/global.css](src/styles/global.css) `@font-face` rules. After bumping the `@fontsource-variable/inter-tight` or `@fontsource/instrument-serif` versions, re-copy the woff2 files manually (see comment at top of `global.css`).

**Design tokens** (colors, fonts, easing curves) are centralized in the `@theme` block at the top of `global.css`, consumed via Tailwind's generated `--color-*`/`--font-*` utilities.
