import { z } from 'zod';
import {
  botActivitySchema,
  botConversationTypeSchema,
  botExecutionStatusSchema,
  botLogSchema,
  botSettingsSchema,
  botScheduleSchema,
  DEFAULT_BOT_SCHEDULE,
  personaSchema,
  scriptSchema,
} from '../../../api-domains';
import { wireCount, wireEntries, wireId } from './wire';
import { createMockReplyWorkflow, mockReplyWorkflowSchema } from '../bot-reply-workflow-schema';

const storedThread = z
  .strictObject({
    id: wireId,
    scriptId: z.string().nullable(),
    kind: z.enum(['script', 'auto', 'reply']).optional(),
    triggerMessageId: z.string().optional(),
    replyRoomId: z.string().optional(),
    status: botExecutionStatusSchema,
    createdAt: z.string(),
    cursor: wireCount,
    nextAt: z.number().nullable(),
    snapshot: scriptSchema
      .pick({ topic: true, groupIds: true, lines: true, delayMinutes: true })
      .extend({ delayMinutes: z.number().int().min(0).max(60) }),
  })
  .refine((thread) => thread.kind === 'reply' || thread.snapshot.delayMinutes >= 1, {
    path: ['snapshot', 'delayMinutes'],
    message: 'D-112: non-reply threads require 1–60 minute spacing',
  });

/** Private mock data only: no auth token, grants, account password or provider configuration. */
export const botSnapshotSchema = z.strictObject({
  personas: z.array(personaSchema),
  scripts: z.array(scriptSchema),
  settings: botSettingsSchema,
  log: z.array(botLogSchema),
  manualSeeded: z.boolean(),
  state: z.strictObject({
    conversationTypes: z
      .array(botConversationTypeSchema.extend({ id: z.uuid(), custom: z.literal(true) }).strict())
      .default([]),
    rotation: wireEntries(
      z.strictObject({ lastScriptId: wireId, updatedAt: z.number().finite() }),
    ).default([]),
    replies: mockReplyWorkflowSchema.default(createMockReplyWorkflow),
    schedule: botScheduleSchema.default(DEFAULT_BOT_SCHEDULE),
    threads: z.array(storedThread),
    activity: z.array(botActivitySchema),
    activityMessages: wireEntries(wireCount),
    todayCount: wireCount,
    audit: z.array(
      z.strictObject({
        action: z.string(),
        entity: z.enum([
          'persona',
          'script',
          'bot_thread',
          'bot_settings',
          'bot_reply_run',
          'bot_conversation_type',
        ]),
        entityId: z.string(),
        at: z.string(),
        actorId: z.string().optional(),
      }),
    ),
    daily: wireEntries(wireCount),
    stoppedAt: z.number().nullable(),
    featureEnabled: z.boolean(),
    replyTriggers: wireEntries(z.string()),
    replyAdmissions: wireEntries(z.number()),
    replyPosted: wireEntries(z.number()),
    groupRate: wireEntries(z.array(z.number())),
    scriptLastRunAt: wireEntries(z.number()),
  }),
});
export type BotSnapshot = z.infer<typeof botSnapshotSchema>;
