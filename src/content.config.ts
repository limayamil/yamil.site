import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: file('src/data/projects.json'),
  schema: z.object({
    title: z.string(),
    client: z.string().optional(),
    year: z.number(),
    /** Disciplines shown under the title, e.g. ['Design Engineering', 'Motion']. */
    roles: z.array(z.string()),
    /** Static frame. Always required — it is also the video's poster. */
    poster: z.string(),
    /** Optional loop. When present the card plays it on hover / in view. */
    video: z.string().optional(),
    href: z.string().optional(),
    featured: z.boolean().default(true),
    order: z.number(),
  }),
});

export const collections = { projects };
