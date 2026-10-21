import type { MailLogRow } from '../../../api-domains';
import { mockDb, nextId } from '../store';
import { registrationState } from './state';

/** Only a fake local queue; no SMTP/provider credentials or OTP code is stored. */
export function requestRegistrationMail(
  kind: 'otp' | 'welcome',
  to: string,
  name: string,
  now: number,
): void {
  const state = registrationState();
  const id = nextId('registration-mail-');
  state.mail.unshift({
    id,
    kind,
    to,
    name,
    subject: kind === 'otp' ? 'Mã xác thực email OPC Hub' : mockDb().welcomeMail.subject,
    status: 'queued',
    attempts: 0,
    error: null,
    sentAt: new Date(now).toISOString(),
  });
  state.jobs.set(id, now + 1);
}

export function registrationMailLog(now = Date.now()): MailLogRow[] {
  const state = registrationState();
  for (const row of state.mail) {
    const due = state.jobs.get(row.id);
    if (row.status !== 'queued' || due === undefined || due > now) continue;
    row.status = 'sent';
    row.attempts += 1;
    row.sentAt = new Date(now).toISOString();
    state.jobs.delete(row.id);
  }
  return state.mail;
}
