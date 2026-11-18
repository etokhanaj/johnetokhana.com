import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Card-level facts (title, org, years, status, image) live in src/data/site.ts.
const work = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/work' }),
  schema: z.object({
    dek: z.string(),
    role: z.string(),
    team: z.string().optional(),
    status: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work };
