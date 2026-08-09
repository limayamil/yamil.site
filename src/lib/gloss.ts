/**
 * Bio paragraphs carry their footnotes inline: `[término](la explicación)`.
 *
 * Splitting at build time keeps the copy in `profile.ts` readable as prose,
 * and keeps the rendered output as plain text nodes — nothing here is ever
 * handed to `set:html`, so Astro still escapes every character.
 *
 * Deliberately naive: a note cannot itself contain `)`, and a term cannot
 * contain `]`. Notes are one short sentence, so a real parser has not earned
 * its keep.
 */

export interface GlossToken {
  text: string;
  /** Present only on the marked term. */
  note?: string;
}

const MARKER = /\[([^\]]+)\]\(([^)]+)\)/g;

export function parseGloss(source: string): GlossToken[] {
  const tokens: GlossToken[] = [];
  let cursor = 0;

  for (const match of source.matchAll(MARKER)) {
    if (match.index > cursor) tokens.push({ text: source.slice(cursor, match.index) });
    tokens.push({ text: match[1], note: match[2] });
    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) tokens.push({ text: source.slice(cursor) });
  return tokens;
}
