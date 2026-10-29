import { z } from 'zod';
import {
  projectCommentSchema,
  projectItemSchema,
  projectMilestonesSchema,
} from '../../../api-domains';

const nullableText = z.string().nullable();
const visibility = z.enum(['public', 'private']);
const extSchema = z.strictObject({
  storeId: nullableText,
  province: z.string(),
  coverUrl: nullableText,
  description: z.string(),
  visibility,
  testUrl: nullableText,
  repo: z
    .strictObject({ provider: z.enum(['github', 'gitlab']), url: z.string(), visibility })
    .nullable(),
  deckUrl: nullableText,
  groupIds: z.array(z.string()),
  contactEmail: nullableText,
  contactPhone: nullableText,
  contactAddress: nullableText,
  highlights: z.array(z.strictObject({ title: z.string(), body: z.string() })),
  gallery: z.array(z.string()),
  milestones: projectMilestonesSchema,
  updatedAt: z.string(),
});

/** Same persisted project records for Portal writes and Admin post-publication moderation. */
export const projectSnapshotSchema = z.strictObject({
  projects: z.array(projectItemSchema),
  ext: z.array(z.tuple([z.string(), extSchema])),
  comments: z.array(projectCommentSchema),
  follows: z.array(z.tuple([z.string(), z.array(z.string())])),
  likes: z.array(z.tuple([z.string(), z.array(z.string())])),
  repoRequests: z.array(z.tuple([z.string(), z.array(z.string())])),
  contactNames: z.array(z.tuple([z.string(), z.string()])),
  idempotency: z.array(z.tuple([z.string(), z.string()])),
  seededComments: z.array(z.string()),
});
export type ProjectSnapshot = z.infer<typeof projectSnapshotSchema>;
