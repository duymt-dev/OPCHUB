import { z } from 'zod';
import { messageSchema, MESSAGE_KINDS } from '../../../api-domains';
import { wireCount, wireEntries } from './wire';

export const chatSnapshotSchema = z
  .strictObject({
    messages: wireEntries(z.array(messageSchema)),
    botMessageMeta: wireEntries(
      z.strictObject({
        threadId: z.string(),
        turn: wireCount,
        kind: z.enum(['script', 'auto', 'reply']),
        roomId: z.string(),
        personaId: z.string(),
        opening: z.boolean(),
        createdAt: z.string(),
        replyToId: z.string().optional(),
      }),
    ),
    ext: wireEntries(
      z.strictObject({
        kind: z.enum(MESSAGE_KINDS),
        senderId: z.string().nullable(),
        replyTo: z.strictObject({ name: z.string(), text: z.string() }).nullable(),
        replyToId: z.string().nullable().optional(),
        reportedBy: z.array(z.string()),
        clientMsgId: z.string().nullable(),
      }),
    ),
    topics: wireEntries(
      z.strictObject({ createdById: z.string().nullable(), createdByName: z.string() }),
    ),
    pins: wireEntries(z.array(z.string())),
    unread: wireEntries(wireEntries(wireCount)),
  })
  .superRefine((data, context) => {
    for (const [room, rows] of data.messages)
      if (rows.some((message) => message.roomId !== room))
        context.addIssue({ code: 'custom', message: 'Persisted message/room mismatch' });
  });
export type ChatSnapshot = z.infer<typeof chatSnapshotSchema>;
