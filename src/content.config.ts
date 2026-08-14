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
  /** Short handwritten callout attached to the hero. Keep it to 2–6 words. */
  heroNote: localized.optional(),
  /** The spec sheet — Role / Client / Year / Stack. Rendered as a <dl>. */
  facts: z.array(z.object({ label: localized, value: localized })).default([]),
  /** The body of the case: a heading plus one or more paragraphs. */
  sections: z
    .array(
      z.object({
        heading: localized,
        body: z.array(localized),
        /** One concise handwritten aside. At most one section uses it per case. */
        note: localized.optional(),
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
        /** One concise handwritten callout. At most one shot uses it per case. */
        note: localized.optional(),
        /** Spans both columns of the gallery grid. */
        wide: z.boolean().default(false),
      }),
    )
    .default([]),
  /** Link out to the real work, where one exists. */
  link: z.object({ label: localized, href: z.string() }).optional(),
  /**
   * Client wordmarks shown top-right of the case header, alongside the
   * title. Optional — most cases name the client in prose only. `alt` is a
   * plain string, not `localized`: it is a company name, the same call
   * `CompanyLogo.astro` makes for the track record.
   */
  clientLogos: z.array(z.object({ src: z.string(), alt: z.string() })).default([]),
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
    /** Disciplines listed in the case detail, e.g. ['Front-end Development']. */
    roles: z.array(localized),
    /** Static frame. Always required — it is also the video's poster. */
    poster: z.string(),
    /**
     * Dark RGB tint sampled from the poster's dominant colour. It colours the
     * tile copy scrim without weakening the contrast guaranteed by its alpha.
     */
    coverTint: z.tuple([
      z.number().int().min(0).max(255),
      z.number().int().min(0).max(255),
      z.number().int().min(0).max(255),
    ]).default([18, 9, 6]),
    /** Optional loop. When present the tile plays it on hover / in view. */
    video: z.string().optional(),
    featured: z.boolean().default(true),
    order: z.number(),
    detail,
  }),
});

export const collections = { projects };
