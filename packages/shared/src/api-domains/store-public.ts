import { z } from 'zod';
import { storeSocialsSchema, storeVideoSchema } from './store-builder';

export const storePublicSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(64);
export const storePublicPatchSchema = z
  .object({
    seoIndex: z.boolean().optional(),
    title: z.string().trim().max(70).optional(),
    desc: z.string().trim().max(160).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Cần ít nhất một trường');
export type StorePublicPatch = z.infer<typeof storePublicPatchSchema>;

export const storePublicConfigSchema = z.object({
  slug: storePublicSlugSchema,
  url: z.url(),
  seoIndex: z.boolean(),
  title: z.string().max(70),
  desc: z.string().max(160),
  defaultTitle: z.string(),
  defaultDesc: z.string().max(160),
  status: z.enum(['draft', 'published', 'hidden']),
});
export type StorePublicConfig = z.infer<typeof storePublicConfigSchema>;

/** Separate allowlist: never extend the authenticated detail DTO for anonymous guests. */
export const storePublicPageSchema = z.object({
  slug: storePublicSlugSchema,
  name: z.string(),
  slogan: z.string(),
  field: z.string(),
  province: z.string(),
  ward: z.string(),
  intro: z.string(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  vision: z.string(),
  mission: z.string(),
  gallery: z.array(z.string()),
  videos: z.array(storeVideoSchema),
  team: z.array(z.object({ name: z.string(), role: z.string(), photoUrl: z.string().nullable() })),
  certs: z.array(z.object({ name: z.string(), imageUrl: z.string().nullable() })),
  items: z
    .array(
      z.object({
        name: z.string(),
        kind: z.enum(['product', 'service']),
        description: z.string(),
        imageUrl: z.string().nullable(),
        price: z.number().int().nullable(),
      }),
    )
    .max(50),
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  address: z.string(),
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  addresses: z.array(z.string()),
  socials: storeSocialsSchema,
  seo: z.object({ index: z.boolean(), title: z.string(), desc: z.string().max(160) }),
});
export type StorePublicPage = z.infer<typeof storePublicPageSchema>;

export function defaultStoreSeo(s: {
  name: string;
  field: string;
  province: string;
  slogan: string;
  intro: string;
}) {
  const location = [s.field, s.province ? `tại ${s.province}` : ''].filter(Boolean).join(' ');
  return {
    defaultTitle: [s.name, location].filter(Boolean).join(' – '),
    defaultDesc: (s.slogan || s.intro).slice(0, 160),
  };
}
