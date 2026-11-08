import { maskPii } from '@opchub/shared';
import { pushLinkSchema, pushPayloadSchema, type PushPayload } from '@opchub/shared/api-domains';

const redact = (value: string, max: number) =>
  maskPii(value.replace(/\d{1,3}(?:\.\d{3})+\s*(?:đ|₫|VND)(?!\p{L})/giu, '[số tiền]')).slice(
    0,
    max,
  );

export function pushPayload(row: {
  id: string;
  title: string;
  body: string;
  link: string;
}): PushPayload {
  return pushPayloadSchema.parse({
    title: redact(row.title, 60),
    body: redact(row.body, 120),
    link: pushLinkSchema.safeParse(row.link).success ? row.link : '/dashboard',
    tag: row.id,
  });
}
