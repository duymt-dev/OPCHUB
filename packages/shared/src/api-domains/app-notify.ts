import { z } from 'zod';
export const APP_PUSH_KINDS = ['msg', 'need', 'renew', 'event', 'store'] as const;
const push = z.strictObject({
  msg: z.boolean(),
  need: z.boolean(),
  renew: z.boolean(),
  event: z.boolean(),
  store: z.boolean(),
});
export const appNotifySettingsSchema = z.strictObject({ pwa: z.boolean(), push });
export const appNotifyPatchSchema = z.strictObject({
  pwa: z.boolean().optional(),
  push: push.partial().optional(),
});
export const appNotifyTestResultSchema = z.strictObject({
  ok: z.literal(true),
  deviceCount: z.number().int().min(0),
});
export type AppNotifySettings = z.infer<typeof appNotifySettingsSchema>;
export type AppNotifyPatch = z.infer<typeof appNotifyPatchSchema>;
export const DEFAULT_APP_NOTIFY: AppNotifySettings = {
  pwa: true,
  push: { msg: true, need: true, renew: true, event: true, store: false },
};
