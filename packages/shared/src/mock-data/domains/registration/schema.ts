import { z } from 'zod';
import {
  adminMemberBusinessSchema,
  adminMemberSchema,
  mailLogRowSchema,
} from '../../../api-domains';
import { wireCount, wireEntries, wireId } from '../community-persistence/wire';
import { GROUP_MEMBER_STATUS } from '../../../enums';
import { registerPersonalSchema, registerBusinessSchema } from '../../../api';

export const publicPersonalRegistrationSchema = registerPersonalSchema.omit({ password: true });
export const publicBusinessRegistrationSchema = registerBusinessSchema.omit({ password: true });
const metadataSchema = z.discriminatedUnion('accountType', [
  z.strictObject({
    accountType: z.literal('personal'),
    input: publicPersonalRegistrationSchema.strict(),
  }),
  z.strictObject({
    accountType: z.literal('business'),
    input: publicBusinessRegistrationSchema.strict(),
  }),
]);
export type RegistrationMetadata = z.infer<typeof metadataSchema>;

export const publicRegistrationProfileSchema = adminMemberSchema
  .strict()
  .extend({
    business: adminMemberBusinessSchema.strict().nullable(),
  })
  .refine(
    (profile) =>
      profile.id === `n-${profile.email}` && profile.email === profile.email.trim().toLowerCase(),
  );
export const pendingRegistrationSchema = z.strictObject({
  profile: publicRegistrationProfileSchema,
  metadata: metadataSchema,
  groupIds: z.array(wireId),
  referralCode: z.string().optional(),
  expiresAt: wireCount,
  otpExpiresAt: wireCount,
});
const requestSchema = z.strictObject({
  userId: wireId,
  groupId: wireId,
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  intro: z.string(),
  requestedAt: z.string(),
});
const uniqueIds = <T extends { id: string }>(rows: T[]) =>
  new Set(rows.map((row) => row.id)).size === rows.length;

export const registrationSnapshotSchema = z
  .strictObject({
    pending: wireEntries(pendingRegistrationSchema),
    profiles: z.array(publicRegistrationProfileSchema).refine(uniqueIds),
    metadata: wireEntries(metadataSchema),
    mail: z.array(mailLogRowSchema.strict()).refine(uniqueIds),
    jobs: wireEntries(wireCount),
    memberships: wireEntries(wireEntries(z.enum(GROUP_MEMBER_STATUS))),
    requests: z.array(requestSchema),
  })
  .refine((data) => {
    const ids = new Set(data.profiles.map((profile) => profile.id));
    const mailIds = new Set(data.mail.map((row) => row.id));
    return (
      data.pending.every(([email, pending]) => email === pending.profile.email) &&
      data.memberships.every(([id]) => ids.has(id)) &&
      data.metadata.every(([id]) => ids.has(id)) &&
      data.requests.every((request) => ids.has(request.userId)) &&
      data.jobs.every(([id]) => mailIds.has(id))
    );
  });
export type RegistrationSnapshot = z.infer<typeof registrationSnapshotSchema>;
export type PendingRegistration = z.infer<typeof pendingRegistrationSchema>;
export const emptyRegistrationSnapshot = (): RegistrationSnapshot => ({
  pending: [],
  profiles: [],
  metadata: [],
  mail: [],
  jobs: [],
  memberships: [],
  requests: [],
});
