import { botState } from '../bot-state';
import { mockDb, resetMockDb } from '../store';

export const AUTO_NOW = Date.parse('2026-10-21T05:00:00Z');

export function autoFixture(count = 3) {
  resetMockDb();
  const db = mockDb();
  db.personas = db.personas.slice(0, count);
  for (const persona of db.personas) {
    persona.enabled = true;
    persona.activeHours = '00:00 - 24:00';
    persona.groupIds = ['c1'];
    persona.postsPerDay = 20;
  }
  db.botSettings = {
    enabled: true,
    autoGenerate: true,
    replyToMembers: false,
    topics: ['First topic', 'Second topic'],
    delayMinutes: 1,
  };
  db.botLog = [];
  db.scripts = [];
  db.messages.clear();
  db.botMessageMeta.clear();
  const state = botState();
  state.threads = [];
  return { db, state };
}
