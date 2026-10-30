import {
  DIRECTOR_REGION_LABEL,
  type DirectorMember,
  type DirectorRegion,
} from '../../../api-domains';
import type { AdminMe } from '../../../api';
import { logSetting } from '../settings-log';
import { nextId } from '../store';
import { mockDirectorState } from './state';

export function recordMockDirector(
  actor: AdminMe,
  region: DirectorRegion,
  action: 'appointed' | 'revoked' | 'updated',
  member: DirectorMember | null,
  now: number,
  extra: Record<string, unknown> = {},
): void {
  const state = mockDirectorState();
  const verb = { appointed: 'Bổ nhiệm', revoked: 'Thu hồi', updated: 'Cập nhật cấu hình' }[action];
  const summary = `${verb} GĐ Vùng ${DIRECTOR_REGION_LABEL[region]}${member ? ` · ${member.fullName}` : ''}`;
  const id = crypto.randomUUID();
  state.history.unshift({
    id,
    region,
    action,
    memberName: member?.fullName ?? null,
    actorName: actor.name,
    actorRole: actor.roleName ?? '',
    at: new Date(now).toISOString(),
    summary,
  });
  logSetting(
    actor.id,
    `regional_director.${action}`,
    region,
    summary,
    'affiliate',
    { region, memberId: member?.id ?? null, historyId: id, ...extra },
    actor.name,
  );
  if (action === 'updated' || !member) return;
  const mailId = nextId('director-mail-');
  state.mail.unshift({
    id: mailId,
    kind: action === 'appointed' ? 'director_appointed' : 'director_revoked',
    to: member.email,
    name: member.fullName,
    subject: action === 'appointed' ? 'Thông báo bổ nhiệm GĐ Vùng' : 'Thông báo thu hồi GĐ Vùng',
    status: 'queued',
    attempts: 0,
    error: null,
    sentAt: new Date(now).toISOString(),
  });
  state.mailJobs.push({ id: mailId, dueAt: new Date(now + 1).toISOString() });
}

/** Local fake queue only. Repeated reads/reloads cannot deliver the same job twice. */
export function mockDirectorMailLog(now = Date.now()) {
  const state = mockDirectorState();
  const due = new Set(
    state.mailJobs.filter((job) => Date.parse(job.dueAt) <= now).map((job) => job.id),
  );
  for (const row of state.mail) {
    if (row.status !== 'queued' || !due.has(row.id)) continue;
    row.status = 'sent';
    row.attempts += 1;
    row.sentAt = new Date(now).toISOString();
  }
  state.mailJobs = state.mailJobs.filter((job) => !due.has(job.id));
  return structuredClone(state.mail);
}
