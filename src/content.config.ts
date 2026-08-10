import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * A string in both of the site's languages — the same shape as `Localized` in
 * `src/data/profile.ts`. Every visible string in a project is one of these:
 * both languages ship in the HTML and CSS shows one, keyed off `html[data-lang]`.
 */
const localized = z.object({ es: z.string(), en: z.string() });

/**
 * The detail view of a case, rendered by `ProjectDetail.astro`. Every array
 * defaults to empty, so a project that only has a lead paragraph is valid —
 * fill these in as the real cases get written.
 */
const detail = z.object({
  /** Opening paragraph, set larger than the body. One or two sentences. */
  lead: localized,
  /** The spec sheet — Role / Client / Year / Stack. Rendered as a <dl>. */
  facts: z.array(z.object({ label: localized, value: localized })).default([]),
  /** The body of the case: a heading plus one or more paragraphs. */
  sections: z
    .array(
      z.object({
        heading: localized,
        body: z.array(localized),
      }),
    )
    .default([]),
  /** Hard numbers. A case can legitimately have none. */
  metrics: z.array(z.object({ value: z.string(), label: localized })).default([]),
  gallery: z
    .array(
      z.object({
        src: z.string(),
        alt: localized,
        caption: localized.optional(),
        /** Spans both columns of the gallery grid. */
        wide: z.boolean().default(false),
      }),
    )
    .default([]),
  /** Link out to the real work, where one exists. */
  link: z.object({ label: localized, href: z.string() }).optional(),
});

const projects = defineCollection({
  loader: file('src/data/projects.json'),
  schema: z.object({
    title: localized,
    /** The deck under the title, on the tile itself. Keep it to one sentence. */
    summary: localized,
    /**
     * Which of the three capabilities this belongs to. The values are the same
     * keys as `Capability.icon` in `profile.ts` — that shared key is what lets
     * the filter row *be* the axes rather than a parallel list of tags.
     */
    axis: z.enum(['engineering', 'motion', 'ops']),
    /**
     * Weight in the bento grid. `primary` spans the full width and two rows,
     * `secondary` covers two cells, `tertiary` one. See `.bento` in global.css.
     */
    tier: z.enum(['primary', 'secondary', 'tertiary']),
    /**
     * Which way a `secondary` lies — two columns across or two rows down. Read
     * only when `tier === 'secondary'`; ignored otherwise.
     */
    shape: z.enum(['horizontal', 'vertical']).default('horizontal'),
    client: z.string().optional(),
    year: z.number(),
    /** Disciplines listed in the case detail, e.g. ['Design Engineering']. */
    roles: z.array(localized),
    /** Static frame. Always required — it is also the video's poster. */
    poster: z.string(),
    /** Optional loop. When present the tile plays it on hover / in view. */
    video: z.string().optional(),
    featured: z.boolean().default(true),
    order: z.number(),
    detail,
  }),
});

export const collections = { projects };
