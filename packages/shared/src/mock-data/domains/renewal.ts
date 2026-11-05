import {
  DEFAULT_RENEWAL,
  renewalSettingsSchema,
  type RenewalSettingsPatch,
  type RenewalQuery,
  type RenewalSend,
  type MailLogRow,
  mailLogRowSchema,
} from '../../api-domains';
import { z } from 'zod';
import { nextRenewalMilestone, renewalDaysLeft } from '../../membership/renewal-milestone';
import { recordAudit } from './audit-store';
import { mockDb, nextId, type MockDb } from './store';

interface State {
  demo?: boolean;
  config: typeof DEFAULT_RENEWAL;
  sent: Map<string, string>;
  mails: MailLogRow[];
}
const states = new WeakMap<MockDb, State>();
const STORAGE = 'opchub.mock.renewal';
const storedSchema = z.object({
  config: renewalSettingsSchema,
  sent: z.record(z.string(), z.iso.datetime()),
  mails: z.array(mailLogRowSchema),
});
function persist(s: State) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(
    STORAGE,
    JSON.stringify({ config: s.config, sent: Object.fromEntries(s.sent), mails: s.mails }),
  );
}
function state() {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { config: structuredClone(DEFAULT_RENEWAL), sent: new Map(), mails: [] };
    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(STORAGE);
        if (raw) {
          const saved = storedSchema.parse(JSON.parse(raw));
          s = { ...saved, sent: new Map(Object.entries(saved.sent)) };
        }
      } catch {
        sessionStorage.removeItem(STORAGE);
      }
    }
    states.set(db, s);
  }
  return s;
}
export const mockRenewalConfig = () => structuredClone(state().config);
/** Same opt-in acceptance fixture as seed:demo --renewal, never changes ordinary mock dates. */
export function seedMockRenewalDemo(now = new Date()) {
  const s = state();
  if (s.demo) return;
  s.demo = true;
  const fee = mockDb().fees.find((f) => f.userId === 'm1');
  if (fee) {
    fee.status = 'active';
    fee.validUntil = new Date(now.getTime() + 12 * 86_400_000).toISOString();
  }
}
export const mockRenewalMailLog = () => state().mails;
export function restoreMockRenewal(value: unknown) {
  state().config = renewalSettingsSchema.parse(value);
}
export function patchMockRenewal(actor: string, patch: RenewalSettingsPatch) {
  const s = state(),
    before = s.config;
  s.config = renewalSettingsSchema.parse({
    milestones: { ...before.milestones, ...patch.milestones },
    channels: { ...before.channels, ...patch.channels },
  });
  recordAudit(actor, 'settings.renewal', 'renewal', 'Cập nhật nhắc gia hạn', {
    before,
    after: s.config,
  });
  persist(s);
  return mockRenewalConfig();
}
export function mockRenewalList(q: RenewalQuery, now = new Date()) {
  const s = state(),
    db = mockDb();
  const rows = db.fees
    .flatMap((f) => {
      if (
        !f.validUntil ||
        !['trial', 'active', 'expiring'].includes(f.status) ||
        f.accountType === 'investor' ||
        (db.userStatus.get(f.userId) ?? 'active') !== 'active'
      )
        return [];
      const d = renewalDaysLeft(new Date(f.validUntil), now);
      return d > 0 && d <= 30
        ? [
            {
              userId: f.userId,
              name: f.fullName,
              email: f.email,
              plan: f.accountType === 'business' ? ('business' as const) : ('personal' as const),
              validUntil: f.validUntil,
              daysLeft: d,
              nextMilestone: nextRenewalMilestone(d, s.config.milestones),
              lastSentAt: s.sent.get(f.userId) ?? null,
            },
          ]
        : [];
    })
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil) || a.userId.localeCompare(b.userId));
  const eligible = rows.filter(
    (r) =>
      !q.cursor ||
      r.validUntil > q.cursor.validUntil ||
      (r.validUntil === q.cursor.validUntil && r.userId > q.cursor.userId),
  );
  const items = eligible.slice(0, q.limit),
    last = items.at(-1);
  return {
    total: rows.length,
    items,
    nextCursor:
      eligible.length > q.limit && last
        ? JSON.stringify({ validUntil: last.validUntil, userId: last.userId })
        : null,
  };
}
export function sendMockRenewal(actor: string, body: RenewalSend, now = new Date()) {
  const s = state(),
    db = mockDb();
  const channels: ('email' | 'app')[] = [];
  if (s.config.channels.email) channels.push('email');
  if (s.config.channels.app) channels.push('app');
  if (!channels.length) return null;
  const rows = mockRenewalList({ limit: Number.MAX_SAFE_INTEGER }, now).items.filter(
    (r) => 'all' in body || body.userIds.includes(r.userId),
  );
  for (const row of rows) {
    s.sent.set(row.userId, now.toISOString());
    if (s.config.channels.email)
      s.mails.unshift({
        id: nextId('renewal-mail'),
        kind: 'fee_reminder',
        to: row.email,
        name: row.name,
        subject: `[OPC Hub] ${row.plan === 'business' ? 'Gói Doanh nghiệp' : 'Gói Cá nhân'} của bạn sẽ hết hạn sau ${row.daysLeft} ngày`,
        sentAt: now.toISOString(),
        status: 'queued',
        attempts: 0,
        error: null,
      });
    if (s.config.channels.app)
      db.notifications.set(row.userId, [
        {
          id: nextId('renewal-note'),
          type: 'membership',
          title: 'Gói thành viên sắp hết hạn',
          body: `${row.plan === 'business' ? 'Gói Doanh nghiệp' : 'Gói Cá nhân'} hết hạn ngày ${new Date(row.validUntil).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Gia hạn để không bị gián đoạn.`,
          link: '/membership/pay',
          read: false,
          createdAt: now.toISOString(),
        },
        ...(db.notifications.get(row.userId) ?? []),
      ]);
  }
  recordAudit(
    actor,
    'fee.renewal_send',
    'renewal',
    `Gửi nhắc gia hạn tới ${rows.length} thành viên`,
    { sent: rows.length, channels },
  );
  persist(s);
  return { sent: rows.length, channels };
}
