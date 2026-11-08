import { z } from 'zod';
import { appNotifySettingsSchema } from './app-notify';

export const pushPreferencesSchema = appNotifySettingsSchema.shape.push;
export type PushPreferences = z.infer<typeof pushPreferencesSchema>;
export type AppPushKind = keyof PushPreferences;
export const pushRealmSchema = z.enum(['member', 'admin']);
export type PushRealm = z.infer<typeof pushRealmSchema>;

/** The HTTP loopback exception is rejected again by the service in production. */
export const pushEndpointSchema = z
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1'))
    );
  }, 'Địa chỉ đẩy phải dùng HTTPS');
const key = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
export const pushSubscribeSchema = z.strictObject({
  endpoint: pushEndpointSchema,
  keys: z.strictObject({ p256dh: key, auth: key }),
  userAgent: z.string().max(300).optional(),
});
export type PushSubscribe = z.infer<typeof pushSubscribeSchema>;
export const pushMutationResultSchema = z.strictObject({ ok: z.literal(true) });
export const pushUnsubscribeSchema = z.strictObject({ endpoint: pushEndpointSchema });
export const pushPublicConfigSchema = z.strictObject({
  enabled: z.boolean(),
  vapidPublicKey: z.string(),
  kinds: pushPreferencesSchema,
});
export type PushPublicConfig = z.infer<typeof pushPublicConfigSchema>;
/** No scheme-relative URLs, encoded separators, backslashes or control characters. */
export const pushLinkSchema = z
  .string()
  .max(1024)
  .refine((value) => {
    try {
      const decoded = decodeURIComponent(value);
      return (
        decoded.startsWith('/') &&
        !decoded.startsWith('//') &&
        !/[\\\s\p{Cc}]/u.test(decoded) &&
        new URL(decoded, 'https://opchub.invalid').origin === 'https://opchub.invalid'
      );
    } catch {
      return false;
    }
  }, 'Đường dẫn thông báo không hợp lệ');
export const pushPayloadSchema = z.strictObject({
  title: z.string().max(60),
  body: z.string().max(120),
  link: pushLinkSchema,
  tag: z.string().min(1).max(200),
});
export type PushPayload = z.infer<typeof pushPayloadSchema>;
