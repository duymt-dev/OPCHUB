import { mockDb, nextId } from './store';
import type { MockDb } from './store-types';
import { iso } from './util';

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  target: string;
  detail: string;
  at: string;
}
const states = new WeakMap<MockDb, AuditEntry[]>();
export function auditLog(): AuditEntry[] {
  const db = mockDb();
  let rows = states.get(db);
  if (!rows) {
    rows = [];
    states.set(db, rows);
  }
  return rows;
}

/** Independent audit storage; new actions use their actual (possibly fake-test) clock. */
export function recordAudit(actorId: string, action: string, target: string, detail = '') {
  auditLog().unshift({ id: nextId('al'), actorId, action, target, detail, at: iso(Date.now()) });
}
