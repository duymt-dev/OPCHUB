import { z } from 'zod';
import {
  directorConfigSchema,
  directorHistorySchema,
  mailLogRowSchema,
} from '../../../api-domains';
import { MEMBERSHIP_FEE_STATUS } from '../../../enums';
import { provinces } from '../../../fixtures';

const previousFeeSchema = z.strictObject({
  userId: z.string().min(1),
  status: z.enum(MEMBERSHIP_FEE_STATUS).exclude(['regional_director']),
  validUntil: z.iso.datetime().nullable(),
});

/** BR-462: the original deadline is data, not a new trial calculated at reload. */
export const mockDirectorSnapshotSchema = z
  .strictObject({
    config: directorConfigSchema,
    previousFees: z.array(previousFeeSchema),
    history: directorHistorySchema.shape.items,
    mail: z.array(
      mailLogRowSchema.extend({ kind: z.enum(['director_appointed', 'director_revoked']) }),
    ),
    mailJobs: z.array(z.strictObject({ id: z.string().min(1), dueAt: z.iso.datetime() })),
  })
  .superRefine((value, ctx) => {
    const invalid = (message: string) => ctx.addIssue({ code: 'custom', message });
    const people = value.config.slots.flatMap((slot) =>
      slot.incumbent ? [slot.incumbent.id] : [],
    );
    const previous = new Set(value.previousFees.map((fee) => fee.userId));
    if (previous.size !== value.previousFees.length) invalid('Duplicate original fee snapshot');
    if (people.length !== previous.size || people.some((id) => !previous.has(id)))
      invalid('Every incumbent must have exactly one original fee snapshot');
    const assigned = [
      ...value.config.slots.flatMap((slot) => slot.provinces),
      ...value.config.unassignedProvinces,
    ];
    const catalog = new Set(provinces.map(([name]) => name));
    if (assigned.length !== catalog.size || assigned.some((name) => !catalog.has(name)))
      invalid('Province partition must contain the complete supported catalog');
    if (new Set(value.history.map((row) => row.id)).size !== value.history.length)
      invalid('Duplicate director history id');
    const mail = new Map(value.mail.map((row) => [row.id, row]));
    if (mail.size !== value.mail.length) invalid('Duplicate director mail id');
    const jobs = new Set(value.mailJobs.map((job) => job.id));
    if (jobs.size !== value.mailJobs.length) invalid('Duplicate director mail job');
    if (value.mailJobs.some((job) => mail.get(job.id)?.status !== 'queued'))
      invalid('Director mail job must reference a queued mail');
    if (value.mail.some((row) => row.status === 'queued' && !jobs.has(row.id)))
      invalid('Queued director mail must have a delivery job');
  });

export type MockDirectorSnapshot = z.infer<typeof mockDirectorSnapshotSchema>;
