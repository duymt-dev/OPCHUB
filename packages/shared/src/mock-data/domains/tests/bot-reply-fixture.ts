import { botState } from '../bot-state';
import { sendChatMessage } from '../chat-messages';
import { mockDb } from '../store';
import { emptyBotHistory } from './dashboard-thread-fixture';

export const REPLY_NOW = Date.parse('2026-10-21T05:00:00Z');
export function replyFixture() {
  const db = emptyBotHistory();
  // Reply-only fixture: stored rotation has separate coordinator coverage.
  for (const script of db.scripts) script.enabled = false;
  db.groupMembers.set(
    'm1',
    new Map([
      ['c1', 'member'],
      ['c2', 'member'],
    ]),
  );
  for (const persona of db.personas) persona.enabled = false;
  const first = db.personas[0];
  const second = db.personas[1];
  if (!first || !second) throw new Error('Missing personas');
  for (const persona of [first, second]) {
    persona.groupIds = ['c1', 'c2'];
    persona.activeHours = '00:00 - 24:00';
    persona.postsPerDay = 20;
  }
  first.enabled = true;
  return { db, first, second, state: botState() };
}

/** Suppress only automatic admission so tests can inject clock/random explicitly. */
export function memberSource(id = 'member-source', roomId = 'c1-general', replyTo?: string) {
  const db = mockDb();
  const enabled = db.botSettings.replyToMembers;
  db.botSettings.replyToMembers = false;
  const result = sendChatMessage('m1', roomId, {
    clientMsgId: id,
    kind: 'text',
    body: `Question ${id}`,
    mentions: [],
    ...(replyTo ? { replyTo } : {}),
  });
  db.botSettings.replyToMembers = enabled;
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export function replyThread() {
  const thread = botState().threads.find((row) => row.kind === 'reply');
  if (!thread || thread.nextAt === null) throw new Error('Missing scheduled reply');
  return thread;
}
