import { z } from 'zod';

export const searchKindSchema = z.enum(['store', 'need', 'project', 'group', 'member']);
export type SearchKind = z.infer<typeof searchKindSchema>;
export const globalSearchQuerySchema = z.object({ q: z.string().trim().min(2).max(100) }).strict();
export const searchHitSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sub: z.string(),
  joined: z.boolean().optional(),
  memberCount: z.number().int().nonnegative().optional(),
});
export type SearchHit = z.infer<typeof searchHitSchema>;
export const globalSearchResultSchema = z.object({
  groups: z
    .array(z.object({ kind: searchKindSchema, items: z.array(searchHitSchema).max(4) }))
    .max(5),
});
export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
