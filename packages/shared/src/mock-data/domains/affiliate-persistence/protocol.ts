import { z } from 'zod';
import { affiliateSnapshotSchema } from './schema';

export const AFFILIATE_BRIDGE_CHANNEL = 'opchub-msw-affiliate-v1';
export const affiliateBridgeHelloSchema = z.strictObject({
  channel: z.literal(AFFILIATE_BRIDGE_CHANNEL),
  type: z.enum(['ping', 'ready', 'begin']),
  fixture: z.enum(['base', 'affiliate']),
});
export const affiliateBridgeCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('commit'), snapshot: affiliateSnapshotSchema }),
  z.strictObject({ type: z.literal('abort') }),
]);
export const affiliateBridgeReplySchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('state'), snapshot: affiliateSnapshotSchema.nullable() }),
  z.strictObject({ type: z.literal('committed') }),
  z.strictObject({ type: z.literal('error') }),
]);
export type AffiliateBridgeReply = z.infer<typeof affiliateBridgeReplySchema>;
