/**
 * Hand-drawn annotations — the marks that read as someone writing on the page.
 *
 * `roughjs` is a devDependency for the same reason `simple-icons` is: Astro
 * runs this file at build time, so only the resulting `<path d>` reaches the
 * browser. The library itself is never bundled and costs the visitor nothing,
 * which is what keeps the runtime JS to the single `motion.ts` file.
 *
 * Rough's whole point is randomness, so **every shape pins a `seed`**. Without
 * one, `RoughGenerator` draws a different curve on every build: the marks would
 * drift between deploys and the built output would diff for no reason.
 *
 * A third kind of drawing, distinct from the other two:
 *   - `Icon.astro`      — hairline strokes, a discipline.
 *   - `ToolIcon.astro`  — solid fills, a tool.
 *   - here              — loose strokes in `--color-primary`, an annotation.
 * Annotations are the only ones that carry colour of their own, which is how
 * they stay legible as a layer on top rather than as more content.
 */

import rough from 'roughjs/bundled/rough.esm.js';

/**
 * The bundled build, not `roughjs/bin/generator`. The `bin/` sources use
 * extensionless relative imports, which Vite resolves but bare Node does not —
 * the bundled ESM entry works under both, so this file stays runnable outside
 * an Astro build (handy for checking a shape in isolation).
 */
const gen = rough.generator();

/** One `<path>`: rough returns stroke and fill as separate entries. */
export interface DoodlePath {
  d: string;
  stroke: string;
  fill: string;
  strokeWidth: number;
}

export interface Doodle {
  viewBox: string;
  /**
   * Whether the mark spans an element of unknown width.
   *
   * `true`  — rendered with `preserveAspectRatio="none"` so the SVG stretches
   *           to whatever box it is placed in, plus `vector-effect` so the pen
   *           weight survives the stretch. This is what replaces the runtime
   *           DOM measuring a library like rough-notation would do.
   * `false` — fixed aspect ratio, positioned at a known size.
   */
  stretch: boolean;
  paths: DoodlePath[];
}

/**
 * Rough emits ~17 decimal places. Two is past the point any display can
 * resolve, and it cuts the shipped markup to roughly a third.
 */
const round = (d: string): string =>
  d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 100) / 100));

type Drawable = ReturnType<typeof gen.line>;

const toPaths = (...drawables: Drawable[]): DoodlePath[] =>
  drawables.flatMap((drawable) =>
    gen.toPaths(drawable).map((path) => ({
      d: round(path.d),
      // Left as `currentColor` so the colour is a CSS decision, never a data one.
      stroke: path.stroke,
      fill: path.fill || 'none',
      strokeWidth: path.strokeWidth,
    })),
  );

const ink = { stroke: 'currentColor', strokeWidth: 1.5 } as const;

/**
 * Marks the surname in the `h1`. Two passes (rough's default) rather than one:
 * a circled word is a thing someone went over twice, and the doubled line is
 * most of what sells it as a pen.
 *
 * `stretch` because the word it rings is a different width in every language
 * and at every clamp step of the `h1`. A ring that ignored that would either
 * crop the word or float away from it.
 */
const oval = (): Doodle => ({
  viewBox: '0 0 132 82',
  stretch: true,
  paths: toPaths(
    gen.ellipse(66, 41, 126, 72, { ...ink, seed: 41, roughness: 1.05, bowing: 2 }),
  ),
});

/**
 * Reaches back from the margin note to the contact link on its left.
 *
 * Three drawables merged into one mark: a curved shaft and the two strokes of
 * the head, in the order a hand would draw them — the stroke-dash reveal
 * traces the same path, so it has to arrive at the point last.
 *
 * Near-horizontal on purpose. The note sits on the same line as the links it
 * points at, so any real vertical travel would read as pointing at the row
 * above or below rather than across.
 */
const arrowLeft = (): Doodle => ({
  viewBox: '0 0 56 24',
  stretch: false,
  paths: toPaths(
    gen.curve(
      [
        [52, 8],
        [38, 13],
        [22, 14],
        [7, 12],
      ],
      { ...ink, seed: 29, roughness: 0.9, bowing: 1 },
    ),
    gen.line(6, 12, 18, 6, { ...ink, seed: 30, roughness: 1.1, disableMultiStroke: true }),
    gen.line(6, 12, 17, 18, { ...ink, seed: 31, roughness: 1.1, disableMultiStroke: true }),
  ),
});

/**
 * Points from the resting note in the capability panel up at the three axis
 * buttons above it — the hint that says the list answers to a pointer.
 *
 * Same three-drawable construction as `arrowLeft`, in the same order (shaft,
 * then the two head strokes), so the dash reveal arrives at the point last.
 * Drawn with real horizontal drift rather than straight up: the note sits
 * under the middle of the panel and the list starts to its left, so a plumb
 * arrow would point at the gap between them.
 */
const arrowUp = (): Doodle => ({
  viewBox: '0 0 30 46',
  stretch: false,
  paths: toPaths(
    gen.curve(
      [
        [23, 42],
        [17, 31],
        [16, 18],
        [11, 6],
      ],
      { ...ink, seed: 44, roughness: 0.9, bowing: 1.4 },
    ),
    gen.line(10, 5, 5, 16, { ...ink, seed: 45, roughness: 1.1, disableMultiStroke: true }),
    gen.line(10, 5, 18, 13, { ...ink, seed: 46, roughness: 1.1, disableMultiStroke: true }),
  ),
});

/**
 * A marker swipe behind a glossed term.
 *
 * Deliberately a very thick stroked line and not a filled rectangle: rough's
 * hachure and zigzag fills expand to ~24kB of path data for a box this size,
 * and a real highlighter *is* one fat pass of a felt tip. The stroke is sized
 * in px because `stretch` marks render with `vector-effect`, so 15 here means
 * 15 CSS pixels — about one line of body copy — at any width.
 */
const highlight = (): Doodle => ({
  viewBox: '0 0 200 22',
  stretch: true,
  paths: toPaths(
    gen.linearPath(
      [
        [3, 13],
        [70, 10],
        [140, 12.5],
        [197, 9.5],
      ],
      { ...ink, strokeWidth: 15, seed: 63, roughness: 0.85, bowing: 1.2, disableMultiStroke: true },
    ),
  ),
});

export const doodles = {
  oval: oval(),
  arrowLeft: arrowLeft(),
  arrowUp: arrowUp(),
  highlight: highlight(),
} satisfies Record<string, Doodle>;

export type DoodleName = keyof typeof doodles;
