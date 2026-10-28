import type { BotScript } from '../../../api-domains';
import { botState } from '../bot-state';
import { mockDb, resetMockDb } from '../store';

export const SCHEDULE_NOW = Date.parse('2026-10-21T05:00:00Z');

export function scriptScheduleFixture() {
  resetMockDb();
  const db = mockDb();
  const base = db.scripts[0];
  const persona = db.personas[0];
  if (!base || !persona) throw new Error('Missing bot catalog fixture');
  const template = structuredClone(base);
  persona.enabled = true;
  persona.activeHours = '00:00 - 24:00';
  persona.groupIds = ['c1'];
  persona.postsPerDay = 1000;
  db.botSettings.enabled = true;
  db.botSettings.autoGenerate = false;
  db.scripts = [];
  db.botLog = [];
  const state = botState();
  state.threads = [];
  const addScript = (id: string, patch: Partial<BotScript> = {}) => {
    const script: BotScript = {
      ...structuredClone(template),
      id,
      enabled: true,
      runAt: new Date(SCHEDULE_NOW - 1000).toISOString(),
      delayMinutes: 1,
      groupIds: ['c1'],
      lines: [
        { personaId: persona.id, body: `Opening ${id}` },
        { personaId: persona.id, body: `Closing ${id}` },
      ],
      ...patch,
    };
    db.scripts.push(script);
    return script;
  };
  return { db, state, addScript };
}
