import type { MailTemplate } from '../api-domains/marketing';
import rawSeed from './prototype-seed.json' with { type: 'json' };

interface TplSeed {
  id: string;
  l: string;
  d: string;
  name: string;
  subject: string;
  body: string;
}

/** Mẫu soạn nhanh Email marketing — nội dung tĩnh của prototype (`MAIL_TPLS`, Q-B42-2) */
export const mailTemplates = (): MailTemplate[] =>
  (rawSeed.MAIL_TPLS as TplSeed[]).map((t) => ({
    id: t.id,
    label: t.l,
    hint: t.d,
    name: t.name,
    subject: t.subject,
    body: t.body,
  }));
