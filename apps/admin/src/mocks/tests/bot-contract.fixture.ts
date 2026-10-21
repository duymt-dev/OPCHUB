import {
  auditLog,
  botState,
  mockDb,
  resetMockDb,
  saveMockMatrix,
} from '@opchub/shared/mock-domains';

export const BOT_READS = [
  '/admin/personas',
  '/admin/scripts',
  '/admin/bot/threads',
  '/admin/bot/activity',
  '/admin/bot/log',
  '/admin/bot/settings',
];
export const BOT_WRITES = [
  ['POST', '/admin/personas'],
  ['PATCH', '/admin/personas/ps1'],
  ['DELETE', '/admin/personas/ps1'],
  ['POST', '/admin/scripts'],
  ['PATCH', '/admin/scripts/sc1'],
  ['DELETE', '/admin/scripts/sc1'],
  ['POST', '/admin/scripts/sc1/run'],
  ['POST', '/admin/bot/threads/th3/stop'],
  ['PATCH', '/admin/bot/settings'],
] as const;

export function botContractFixture() {
  resetMockDb();
  const saved = saveMockMatrix('admin', { 'role-editor': ['bots.view'] });
  if (!saved.ok) throw new Error(saved.message);
  auditLog().splice(0);
  botState();
}
export const botRequest = (path: string, method = 'GET', body?: unknown, actor = 'admin') =>
  fetch(`${location.origin}/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

export function botSnapshot() {
  const db = mockDb();
  return structuredClone({
    personas: db.personas,
    scripts: db.scripts,
    settings: db.botSettings,
    log: db.botLog,
    threads: botState().threads,
    audit: botState().audit,
    machine: auditLog(),
  });
}
