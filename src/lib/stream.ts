/**
 * Streaming copy — a paragraph split so each word can arrive on its own beat.
 *
 * Split at build time, for the same reason `gloss.ts` is: the output is plain
 * text nodes inside plain spans, nothing is handed to `set:html`, and the whole
 * effect is then a CSS animation with a per-word `animation-delay`. No JS runs
 * for it, which is what makes it survive the two places a JS-driven version
 * would break — a view that has been `display: none` since load (the track
 * record, the inactive language), where an IntersectionObserver never gets a
 * box and a one-shot script has already run.
 *
 * The split keeps the whitespace rather than discarding it: the gaps are
 * rendered as ordinary text nodes between the spans, so the words stay `inline`
 * and the line breaks — and `text-wrap: pretty` — behave exactly as they did
 * before the spans existed. Splitting on `/\s+/` and re-joining with a space
 * would instead lose the boundary around a gloss, whose surrounding whitespace
 * belongs to the text token beside it.
 */

/**
 * A paragraph as alternating word and whitespace chunks, in source order.
 * Test a chunk with `isWord` — a whitespace chunk renders as itself.
 */
export function streamChunks(text: string): string[] {
  return text.split(/(\s+)/).filter((chunk) => chunk !== '');
}

export function isWord(chunk: string): boolean {
  return /\S/.test(chunk);
}
