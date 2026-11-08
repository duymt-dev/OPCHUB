import type { MailLogRow, RegionalRegion } from '../../api-domains';
import { REGIONAL_LABELS } from '../../api-domains';
import { mockDb, type MockDb } from './store';

const logs = new WeakMap<MockDb, MailLogRow[]>();
export function mockRegionalMailLog(): MailLogRow[] {
  return logs.get(mockDb()) ?? [];
}
export function restoreMockRegionalMailLog(rows: MailLogRow[]): void {
  logs.set(mockDb(), rows);
}

/** Same observable mail kinds as the real outbox handler; never sends external mail. */
export function requestMockRegionalMail(
  member: { email: string; fullName: string },
  region: RegionalRegion,
  action: 'appoint' | 'revoke',
  at: number,
  reason: 'manual' | 'locked' = 'manual',
): void {
  const rows = mockRegionalMailLog();
  rows.unshift({
    id: crypto.randomUUID(),
    kind: action === 'appoint' ? 'regional_director_appoint' : 'regional_director_revoke',
    to: member.email,
    name: member.fullName,
    subject: `${action === 'appoint' ? 'Bổ nhiệm' : 'Thu hồi'} GĐ Vùng ${REGIONAL_LABELS[region]}${reason === 'locked' ? ' do tài khoản bị khóa' : ''}`,
    sentAt: new Date(at).toISOString(),
    status: 'sent',
    attempts: 1,
    error: null,
  });
  logs.set(mockDb(), rows);
}
